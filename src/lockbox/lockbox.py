#!/usr/bin/env python
"""Driver module for the Lockbox program."""

__author__ = 'tierney@cs.nyu.edu (Matt Tierney)'

from calendar import timegm
import boto
import cPickle
import logging
import os
import stat
import sys
import time

from threading import Thread, Lock
from crypto import CryptoHelper
from S3 import Connection, BlobStore
from SQLiteHelper import SQLiteHelper as SQL
from group_manager import GroupManager
from crypto_util import get_random_uuid


import gflags
FLAGS = gflags.FLAGS
gflags.DEFINE_string('lock_domain_name', None, 'Lock domain name for a group.')
gflags.DEFINE_string('data_domain_name', None, 'Data domain name for a group.')
gflags.DEFINE_string('blob_bucket_name', None, 'Blob bucket name.')
gflags.MarkFlagAsRequired('lock_domain_name')
gflags.MarkFlagAsRequired('data_domain_name')
gflags.MarkFlagAsRequired('blob_bucket_name')


class Lockbox(object):
  def __init__(self, s3_connection, sdb_connection, sns_connection,
               sqs_connection, gpg, event_handler):
    # TODO(tierney): Add connection type assertions.
    self.s3_connection = s3_connection
    self.sdb_connection = sdb_connection
    self.sns_connection = sns_connection
    self.sqs_connection = sqs_connection
    self.gpg = gpg
    self.event_handler = event_handler

    self.id = None

    # Should be apart of init process..
    self.sdb_directory = os.path.expanduser(config['sdb_directory'])
    if not os.path.exists(self.sdb_directory):
      os.mkdir(self.sdb_directory)
    elif not os.path.isdir(self.sdb_directory):
      os.remove(self.sdb_directory)
      os.mkdir(self.sdb_directory)

    self.crypto_helper = CryptoHelper(os.path.expanduser('~/.lockbox/keys'))
    self.S3Conn = Connection(config, prefix='/data')

  def bootstrap(self):
    # Corresponds to the local, monitored directory.
    self.id = get_random_uuid()
    self.group_manager = GroupManager(self.sns_connection, self.sqs_connection)
    self.group_manager = create_group(self.id)


  def monitor_cloud_files(self):
    """Pull for changes from the queue for the files that we want to monitor. We
    should receive updates through SNS+SQS. (Likely, polling for state from S3
    is too expensive.)"""
    group = self.group_manager.get(self.id)
    message = group.receive()


  def run(self):
    observer = Observer()
    # Much verify that the roots are not included in each other.
    for root in self.file_roots:
      observer.schedule(self.event_handler, root, recursive=True)

    # TODO(tierney): Can we add an observer that detects tree diffs.
    observer.start()

    # Subscribe to SNS and SQS.

    # TODO(tierney): Continue running until the input says to quit.

def main(argv):
  try:
    argv = FLAGS(argv)
  except gflags.FlagsError, e:
    print '%s\\nUsage: %s ARGS\\n%s' % (e, sys.argv[0], FLAGS)
    sys.exit(1)
  if FLAGS.debug:
    print 'non-flag arguments:', argv

  # Event handler.
  Lockbox()

if __name__ == '__main__':
  main(sys.argv)

