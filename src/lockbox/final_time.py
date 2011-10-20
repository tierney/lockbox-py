#!/usr/bin/env python

import boto
import gflags
import logging
import sys
from credentials import Credentials
from group_manager import GroupManager

FLAGS = gflags.FLAGS

gflags.DEFINE_boolean('debug', False, 'Enable debug logging.')
gflags.DEFINE_string('internal_directory', None, 'Internal DBs directory.')

gflags.MarkFlagAsRequired('internal_directory')

logging.basicConfig(level=logging.INFO, stream=sys.stderr)

class FinalTime(object):
  """Removes any evidence of Lockbox management data, including local state
  databases, deletes values stored in the cloud, putting the system into a state
  where first_time.py could be run without conflict."""

  # Determine which groups we are the owner of so that we can shutdown the
  # system.

  pass

def final_time():
  logging.info('We are entering the final time.')
  credentials = Credentials(database_directory=FLAGS.internal_directory)
  owners_data = credentials.owner()
  print owners_data

  for (group_id, aws_access_key_id, aws_secret_access_key) in owners_data:
    sns_connection = boto.connect_sns(aws_access_key_id, aws_secret_access_key)
    sqs_connection = boto.connect_sqs(aws_access_key_id, aws_secret_access_key)
    iam_connection = boto.connect_iam(aws_access_key_id, aws_secret_access_key)
    group_manager = GroupManager(sns_connection, sqs_connection, iam_connection,
                                 database_directory=FLAGS.internal_directory)
    group_manager.delete_group(group_id)


def main(argv):
  try:
    argv = FLAGS(argv)
  except gflags.FlagsError, e:
    print '%s\nUsage: %s ARGS\n%s' % (e, sys.argv[0], FLAGS)
    sys.exit(1)
  if FLAGS.debug:
    print 'non-flag arguments:', argv

  final_time()

if __name__ == '__main__':
  main(sys.argv)
