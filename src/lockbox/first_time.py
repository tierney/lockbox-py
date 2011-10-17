#!/usr/bin/env python

import boto
import gflags
import logging
import os
import sys

FLAGS = gflags.FLAGS

gflags.DEFINE_boolean('debug', False, 'Sets debug logging.')
gflags.DEFINE_string('internal_directory', os.path.expanduser('~/.lockbox'),
                     'Internal data directory path.')
gflags.DEFINE_string('lock_domain_name', None, 'Lock domain name for a group.')
gflags.DEFINE_string('data_domain_name', None, 'Data domain name for a group.')
gflags.DEFINE_string('blob_bucket_name', None, 'Blob bucket name.')
gflags.DEFINE_string('lockbox_directory', None, 'Directory to monitor.')
gflags.DEFINE_string('aws_access_key_id', None, 'AWS Access Key ID.')
gflags.DEFINE_string('aws_secret_access_key', None, 'AWS Secret Access Key.')

gflags.MarkFlagAsRequired('lock_domain_name')
gflags.MarkFlagAsRequired('data_domain_name')
gflags.MarkFlagAsRequired('blob_bucket_name')
gflags.MarkFlagAsRequired('lockbox_directory')
gflags.MarkFlagAsRequired('aws_access_key_id')
gflags.MarkFlagAsRequired('aws_secret_access_key')

logging.basicConfig(level=logging.INFO)

class FirstTime(object):
  # Clear databases.
  os.removedirs(FLAGS.internal_directory)
  os.makedirs(FLAGS.internal_directory)

  s3_connection = boto.connect_s3(
    aws_access_key_id=FLAGS.aws_access_key_id,
    aws_secret_access_key=FLAGS.aws_secret_access_key,
    database_directory=FLAGS.internal_directory)
  sdb_connection = boto.connect_sdb(
    aws_access_key_id=FLAGS.aws_access_key_id,
    aws_secret_access_key=FLAGS.aws_secret_access_key,
    database_directory=FLAGS.internal_directory)
  sqs_connection = boto.connect_sqs(
    aws_access_key_id=FLAGS.aws_access_key_id,
    aws_secret_access_key=FLAGS.aws_secret_access_key,
    database_directory=FLAGS.internal_directory)
  sns_connection = boto.connect_sns(
    aws_access_key_id=FLAGS.aws_access_key_id,
    aws_secret_access_key=FLAGS.aws_secret_access_key,
    database_directory=FLAGS.internal_directory)
  iam_connection = boto.connect_iam(
    aws_access_key_id=FLAGS.aws_access_key_id,
    aws_secret_access_key=FLAGS.aws_secret_access_key,
    database_directory=FLAGS.internal_directory)

  group_manager = GroupManager(sns_connection, sqs_connection, iam_connection,
                               database_directory=FLAGS.internal_directory)

  # 


def main(argv):
  try:
    argv = FLAGS(argv)
  except gflags.FlagsError, e:
    print '%s\nUsage: %s ARGS\n%s' % (e, sys.argv[0], FLAGS)
    sys.exit(1)
  if FLAGS.debug:
    print 'non-flag arguments:', argv


if __name__ == '__main__':
  main(sys.argv)
