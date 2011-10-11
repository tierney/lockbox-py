#!/usr/bin/env python
'''
Filenames on the cloud should be the SHA-1 of file contents.

Should have an interface version of this class so that we can use a mock for
local testing.
'''
import logging
import sys
import time


BUCKET_NAME_PADDING_LEN = 20
METADATA_TAG_MD5 = 'orig_file_md5'


def _progress_meter(so_far, total):
  percent = 100 * (so_far / (1. * total))
  percent_int = int(percent)
  sys.stdout.write('[%-100s] %7s\r' % (100 * '*', 7 * ' '))
  sys.stdout.write('[%-100s] %-3.2f%%\r' % (percent_int * '*', percent))
  sys.stdout.flush()


class BlobStore(object):
  def __init__(self, connection, bucket_name):
    self.connection = connection
    self.bucket_name = bucket_name
    self.bucket = None
    self._connect_bucket()


  def _get_bucket(self, bucket_name):
    if self.connection.lookup(bucket_name, validate=True):
      logging.info('Returning already-existing bucket.')
      return self.connection.get_bucket(bucket_name, validate=True)
    logging.info('Creating and returning new bucket.')
    return self.connection.create_bucket(bucket_name)


  def _connect_bucket(self):
    self.bucket = self._get_bucket(self.bucket_name)


  def _get_key(self, key_name):
    key = self.bucket.get_key(key_name)
    if not key:
      key = self.bucket.new_key(key_name)
    return key


  def put_string(self, hash_file, string):
    key = self._get_key(hash_file)
    key.set_contents_from_string(string, cb=_progress_meter)


  def put_file(self, hash_file, fp):
    key = self._get_key(hash_file)
    # TODO(tierney): Would want to have a callback to monitor the progress of
    # the upload.
    key.set_contents_from_file(fp, cb=_progress_meter)


  def put_filename(self, hash_file, filename):
    with open(filename) as fp:
      self.put_file(hash_file, fp)


if __name__ == '__main__':
  main()
