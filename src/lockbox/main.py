#!/usr/bin/env python
"""Driver module for the Lockbox program."""

__author__ = 'tierney@cs.nyu.edu (Matt Tierney)'

import boto
import gflags
import gnupg
import logging
import sys
from event_handler import LockboxEventHandler
from remote_local_mediator import RemoteLocalMediator
from lockbox import Lockbox

FORMAT = "%(asctime)-15s %(levelname)-10s %(module)-10s %(lineno)-3d ThreadID:%(thread)-2d %(message)s"

logging.basicConfig(level=logging.INFO,
                    format=FORMAT,
                    stream=sys.stderr)

FLAGS = gflags.FLAGS

gflags.DEFINE_boolean('debug', False, 'Sets debug logging.')
gflags.DEFINE_string('lock_domain_name', None, 'Lock domain name for a group.')
gflags.DEFINE_string('data_domain_name', None, 'Data domain name for a group.')
gflags.DEFINE_string('blob_bucket_name', None, 'Blob bucket name.')
gflags.DEFINE_multistring('directory', None, 'Directory to monitoring.')

gflags.MarkFlagAsRequired('lock_domain_name')
gflags.MarkFlagAsRequired('data_domain_name')
gflags.MarkFlagAsRequired('blob_bucket_name')
gflags.MarkFlagAsRequired('directory')


def main(argv):
  try:
    argv = FLAGS(argv)
  except gflags.FlagsError, e:
    print '%s\nUsage: %s ARGS\n%s' % (e, sys.argv[0], FLAGS)
    sys.exit(1)
  if FLAGS.debug:
    print 'non-flag arguments:', argv

  s3_connection = boto.connect_s3()
  sdb_connection = boto.connect_sdb()
  sns_connection = boto.connect_sns()
  sqs_connection = boto.connect_sqs()

  gpg = gnupg.GPG()

  remote_local_mediator = RemoteLocalMediator()
  event_handler = LockboxEventHandler(remote_local_mediator)

  lockbox = Lockbox(s3_connection, sdb_connection, sns_connection,
                    sqs_connection, gpg, event_handler,
                    remote_local_mediator, FLAGS.directory)
  lockbox.run()

if __name__ == '__main__':
  main(sys.argv)