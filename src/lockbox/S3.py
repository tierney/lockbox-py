#!/usr/bin/env python

import os
import random
import re
import string
import time

import ConfigParser
import Queue
import boto.s3
import calendar
import constants as C
import socket
from bundle import AWSFileBundle as bundler
from util import log

BUCKET_NAME_PADDING_LEN = 20
METADATA_TAG_MD5 = 'orig_file_md5'

def Policy(object):
  @staticmethod
  def string_to_dns(string):
    # Reasonable replacements (don't know if users will hate us for this)
    string = re.sub(r'[^\w.-]', '-',).strip()

    # Check length of the string
    string = string.lower()
    string = string[:63]
    if len(string) < 3:
      return None

    # Make sure we do not have an IP address
    try:
      socket.inet_aton(string)
      # we have a legal ip address (so bad!)
      return None
    except socket.error:
      # we have an invalid ip addr, so we might be okay
      pass

    return string

class Connection(object):
  def __init__(self, conf, prefix):
    self.conf = conf

    self.prefix = prefix
    self.bucket_name = conf.get("bucket_name")
    self.staging_directory = conf.get("staging_directory")
    self.aws_access_key_id = conf.get("aws_access_key")
    self.aws_secret_access_key = conf.get("aws_secret_key")
    self.email_address = conf.get("email_address")
    self.computer_name = conf.get("computer_name")

    self.queue = Queue.Queue()

    self._connect()
    # should check if the bucket exists in S3.
    self._set_bucket(self.bucket_name)

  class Directory(object):
    """
    This class provides access to the 'directory' on S3. The idea
    is that every file we care about in our system would have a
    unique file path that it corresponds to.
    """
    def __init__(self, connection, bucket, dirpath):
      self.conn = connection
      self.bucket = bucket
      self.dir = dirpath

    def list(self):
      return self.bucket.get_all_keys(prefix=self.dir)

    def read(self, file):
      keypath = os.path.join(self.dir, file)
      key = self.bucket.get_key(keypath)
      if key:
        return key.get_contents_as_string()
      return None

    def write(self, file, contentfp, md5=None):
      keyname = os.path.join(self.dir, file)
      log.info("keyname: %s" % keyname)
      key = boto.s3.key.Key(self.bucket, keyname)
      if md5: key.set_metadata(METADATA_TAG_MD5, md5)
      key.set_contents_from_string(contentfp)

  def create_dir(self, hashed_path_to_filename):
    return self.Directory(self.conn, self.bucket, hashed_path_to_filename)

  def _connect(self):
    self.conn = boto.connect_s3(self.aws_access_key_id,
                  self.aws_secret_access_key)

  def _set_bucket(self, bucket_name):
    self.bucket = boto.s3.bucket.Bucket(self.conn, bucket_name)

  def _create_bucket(self, bucket_name):
    self.conn.create_bucket(bucket_name)
    self.bucket = self.conn.get_bucket(bucket_name)
    self.bucket.configure_versioning(True)
    self.bucket.make_public()
    pass

  def create_bucket(self):
    # Need to make creating a public bucket and admin bucket easy.
    #
    # store the bucket_name in our configuration
    prefix = Policy.string_to_dns(self.prefix)

    s = "".join([random.choice(string.lowercase + string.digits)
                 for x in range(1, BUCKET_NAME_PADDING_LEN)])
    bucket_name = prefix + '.' + s
    return bucket_name
    #self._create_bucket(s)

  def get_all_buckets(self):
    return self.conn.get_all_buckets()

  def get_all_keys(self):
    # check if bucket exists?
    return self.bucket.get_all_keys()

  def send_filename(self, s3key, filename_src, file_md5):
    key = boto.s3.key.Key(self.bucket, s3key)
    key.set_metadata(METADATA_TAG_MD5, file_md5)
    key.set_contents_from_filename(filename_src)

  def get_metadata(self, s3key, metadata):
    key = self.bucket.get_key(s3key)
    print key.md5
    return key.get_metadata(metadata)

  def get_filename(self, s3key, filename_dest):
    # could add a progress meter here.
    key = self.bucket.get_key(s3key)
    print key.last_modified
    if key:
      key.get_contents_to_filename(filename_dest)
      return filename_dest
    return None

  def enqueue(self, filename, state):
    self.queue.put([filename, state])

  def proc_queue(self, prefix_to_ignore, crypto_helper):
    while True:
      filename, state = self.queue.get()
      relative_filepath = filename.replace(prefix_to_ignore, '')
      print 'relative_filepath:', relative_filepath
      key_filename = '.'.join([relative_filepath,
                               self.email_address,
                               self.computer_name])
      if C.PNEW == state:
        self.pnew_key = self.bucket.get_key(key_filename)
        with open(filename) as fp:
          file_md5 = boto.s3.key.Key().compute_md5(fp)[0]
        if not self.pnew_key: # New file when we started up
          bundle_helper = bundler(self.conf, self, filename, crypto_helper)
          with open(filename) as fp:
            bundle_helper.add_content(fp, file_md5)
          print "Exact file we expect to send:", filename
          # val_filename = os.path.join(self.staging_directory, enc_filepath)
          # self.send_filename(bundle_helper, filename, file_md5)
        else: # Existing file. Checking if stale.
          with open(filename) as fp:
            md5, md5b64 = self.pnew_key.compute_md5(fp)
          if self.pnew_key.get_metadata(METADATA_TAG_MD5) != md5:
            enc_filepath = crypto_helper.bundle(filename)
            val_filename = os.path.join(self.staging_directory, enc_filepath)
            self.send_filename(key_filename, val_filename, file_md5)

      if C.UPDATED == state:
        with open(filename) as fp:
          md5, md5b64 = boto.s3.key.Key().compute_md5(fp)
        enc_filepath = crypto_helper.bundle(filename)
        val_filename = os.path.join(self.staging_directory, enc_filepath)
        self.send_filename(key_filename, val_filename, md5)

      if C.NOT_VISITED == state:
        # delete file(s)...
        relative_filepath = filename.replace(prefix_to_ignore, '')
        keys = self.bucket.get_all_keys(prefix=relative_filepath)
        for key in keys:
          self.bucket.delete_key(key)
      self.queue.task_done()


def main():
  # User must setup an AWS account
  cp = ConfigParser.ConfigParser()
  cp.read(os.path.expanduser('~/.safe-deposit-box/test.cfg'))

  from config import Config
  conf = Config(user_id='test@test.com',
          access_key=cp.get('aws', 'access_key_id'),
          secret_key=cp.get('aws', 'secret_access_key'),
          staging_dir='/tmp',
          bucket='safe-deposit-box')


  b = Connection(conf, prefix='/data')

  print b.get_all_buckets()
  for k in b.get_all_keys():
    mtime = k.last_modified
    print mtime
    print time.strptime(mtime.replace("Z", ''), u"%Y-%m-%dT%H:%M:%S.000")
    print calendar.timegm(time.strptime(mtime.replace("Z", ''), u"%Y-%m-%dT%H:%M:%S.000"))
    print "   ", k, mtime

  b.create_bucket()


  b.send_filename('DESIGN', 'DESIGN', md5)

def test_string_to_dns():
  print Policy.string_to_dns("he")
  print Policy.string_to_dns("he         ")
  print Policy.string_to_dns("hello worlds")
  print Policy.string_to_dns("hello worlds!")
  print Policy.string_to_dns("hello worlds-")
  print Policy.string_to_dns("hello's worlds-")
  print Policy.string_to_dns("hello's worlds---")
  print Policy.string_to_dns("hello\"s worlds---")
  print Policy.string_to_dns("Matt Tierney's Bronx iMac " * 10)
  print Policy.string_to_dns("140.247.61.26")
  print Policy.string_to_dns("277.247.61.26")
  print Policy.string_to_dns("I-.-.-like--.three.dots")
  print Policy.string_to_dns("I.like.three.dots")

if __name__ == "__main__":
  main()
