#!/usr/bin/env python

import boto
import gflags
import logging
import os
import sys
from blob_store import BlobStore
from credentials import Credentials
from crypto_util import get_random_uuid
from group_manager import GroupManager
from metadata_store import MetadataStore

FLAGS = gflags.FLAGS

gflags.DEFINE_boolean('debug', False, 'Sets debug logging.')
gflags.DEFINE_string('internal_directory', os.path.expanduser('~/.lockbox'),
                     'Internal data directory path.')
gflags.DEFINE_string('lock_domain_name', None, 'Lock domain name for a group.')
gflags.DEFINE_string('data_domain_name', None, 'Data domain name for a group.')
gflags.DEFINE_string('blob_bucket_name', None, 'Blob bucket name.')
gflags.DEFINE_string('lockbox_directory', os.path.expanduser('~/lockbox'),
                     'Directory to monitor.')
gflags.DEFINE_string('namespace', None, 'Namespace (usually, AWS account ID.')
gflags.DEFINE_string('aws_access_key_id', None, 'AWS Access Key ID.')
gflags.DEFINE_string('aws_secret_access_key', None, 'AWS Secret Access Key.')

gflags.MarkFlagAsRequired('lock_domain_name')
gflags.MarkFlagAsRequired('data_domain_name')
gflags.MarkFlagAsRequired('blob_bucket_name')
gflags.MarkFlagAsRequired('lockbox_directory')
gflags.MarkFlagAsRequired('aws_access_key_id')
gflags.MarkFlagAsRequired('aws_secret_access_key')

logging.basicConfig(level=logging.INFO)


def _rm_rf(directory):
  for afile in os.listdir(directory):
    if os.path.isdir(afile):
      _rm_rf(os.path.join(directory, afile))
      os.rmdir(afile)
      continue
    os.remove(os.path.join(os.path.join(directory), afile))
  os.removedirs(directory)


def first_time():
  # Clear internal databases' directory.
  _rm_rf(FLAGS.internal_directory)

  # Make internal databases' directory.
  os.makedirs(FLAGS.internal_directory)

  s3_connection = boto.connect_s3(
    aws_access_key_id=FLAGS.aws_access_key_id,
    aws_secret_access_key=FLAGS.aws_secret_access_key)
  sdb_connection = boto.connect_sdb(
    aws_access_key_id=FLAGS.aws_access_key_id,
    aws_secret_access_key=FLAGS.aws_secret_access_key)
  sqs_connection = boto.connect_sqs(
    aws_access_key_id=FLAGS.aws_access_key_id,
    aws_secret_access_key=FLAGS.aws_secret_access_key)
  sns_connection = boto.connect_sns(
    aws_access_key_id=FLAGS.aws_access_key_id,
    aws_secret_access_key=FLAGS.aws_secret_access_key)
  iam_connection = boto.connect_iam(
    aws_access_key_id=FLAGS.aws_access_key_id,
    aws_secret_access_key=FLAGS.aws_secret_access_key)

  # Creates notification service topics and queues.
  group_manager = GroupManager(sns_connection, sqs_connection, iam_connection,
                               database_directory=FLAGS.internal_directory)

  # Creates S3 Bucket.
  blob_store = BlobStore(s3_connection, FLAGS.blob_bucket_name)
  assert isinstance(blob_store.bucket, boto.s3.bucket.Bucket)
  
  # Creates SimpleDB domains.
  metadata_store = MetadataStore(sdb_connection, FLAGS.lock_domain_name,
                                 FLAGS.data_domain_name, 
                                 database_directory=FLAGS.internal_directory)

  # Credentials table.
  credentials = Credentials(database_directory=FLAGS.internal_directory)
  if not credentials.set_credentials(get_random_uuid(), 'us-east-1', 
                                     FLAGS.namespace, FLAGS.aws_access_key_id, 
                                     FLAGS.aws_secret_access_key, 'OWNER'):
    logging.error('We were unable to set our own owner credentials.')


def main(argv):
  try:
    argv = FLAGS(argv)
  except gflags.FlagsError, e:
    print '%s\nUsage: %s ARGS\n%s' % (e, sys.argv[0], FLAGS)
    sys.exit(1)
  if FLAGS.debug:
    print 'non-flag arguments:', argv

  first_time()

if __name__ == '__main__':
  main(sys.argv)
