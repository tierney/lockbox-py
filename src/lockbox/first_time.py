#!/usr/bin/env python

import boto
import gflags
import logging
import os
import sys
from credentials import Credentials
from crypto_util import get_random_uuid
from group_manager import GroupManager

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


def first_time():
  # Clear databases.
  for afile in os.listdir(FLAGS.internal_directory):
    os.remove(os.path.join(FLAGS.internal_directory, afile))
  os.removedirs(FLAGS.internal_directory)
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

  group_manager = GroupManager(sns_connection, sqs_connection, iam_connection,
                               database_directory=FLAGS.internal_directory)

  # Credentials table.
  credentials = Credentials(database_directory=FLAGS.internal_directory)
  if not credentials.set(get_random_uuid(), 'us-east-1', FLAGS.namespace,
                         FLAGS.aws_access_key_id, FLAGS.aws_secret_access_key,
                         'owner'):
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
