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

class FileNotFound(Exception): pass

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
        self.prefix = prefix
        self.bucket_name = conf.get("bucket_name")
        self.staging_directory = conf.get("staging_directory")
        self.aws_access_key_id = conf.get("aws_access_key")
        self.aws_secret_access_key = conf.get("aws_secret_key")
        self.queue = Queue.Queue()

        self._connect()
        # should check if the bucket exists in S3.
        self._set_bucket(self.bucket_name)

    class Directory(object):
      def __init__(self, connection, bucket, dir):
        self.conn = connection
        self.bucket = bucket
        self.dir = dir

      def list(self): pass
      def read(self, file): pass
      def write(self, file, contentfp): pass


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
            key_filename = '.'.join([relative_filepath, self.display_name, self.location])

            if C.PNEW == state:
                self.pnew_key = self.bucket.get_key(key_filename)
                with open(filename) as fp:
                    file_md5 = boto.s3.key.Key().compute_md5(fp)[0]
                if not self.pnew_key: # New file when we started up
                    enc_filepath = crypto_helper.bundle(filename)
                    print "This is the file we expect to be sent", enc_filepath, filename
                    val_filename = os.path.join(self.staging_directory, enc_filepath)
                    self.send_filename(key_filename, val_filename, file_md5)
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

    # b.get_filename('key1','key1.DESIGN')

    # b = boto.s3.bucket.Bucket(s3c, 'testfiles.sdb')
    # b.add_email_grant(<AWS user's email address>)
    # b.configure_versioning(True)

    # k = boto.s3.key.Key(b, 'key0')
    # # k.add_email_grant(<AWS user's email address>)
    # k.set_contents_from_filename("DESIGN.enc")

    # k = boto.s3.key.Key(b, 'dir0/dir1/dir2/key0')
    # k.set_contents_from_filename("DESIGN.enc")

    # k = boto.s3.key.Key(b, 'dir0/dir1/dir3/key0')
    # k.set_contents_from_filename("DESIGN.enc")

    # k = boto.s3.key.Key(b, 'dir0/dir1/dir2/key1')
    # k.set_contents_from_filename("DESIGN.enc")


def test_string_to_dns():
    print Policy.string_to_dns("he")
    print Policy.string_to_dns("he               ")
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
