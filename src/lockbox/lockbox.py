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

from watchdog.observers import Observer
from util import enum

_DIR_AGE = enum('UNKNOWN', 'NEW', 'EXISTING')


class Lockbox(object):
  def __init__(self, s3_connection, sdb_connection, sns_connection,
               sqs_connection, gpg, event_handler, remote_local_mediator,
               directories):
    # TODO(tierney): Add connection type assertions.
    self.s3_connection = s3_connection
    self.sdb_connection = sdb_connection
    self.sns_connection = sns_connection
    self.sqs_connection = sqs_connection
    self.gpg = gpg
    self.event_handler = event_handler
    self.mediator = remote_local_mediator
    self.directories = [os.path.expanduser(path) for path in directories]
    self.directories_foreknowledge = dict((directory, _DIR_AGE.UNKNOWN) for
                                          directory in self.directories)
    self.id = None

    # self.crypto_helper = CryptoHelper(os.path.expanduser('~/.lockbox/keys'))
    # self.S3Conn = Connection(config, prefix='/data')
    logging.info('dirs: %s' % self.directories)


  def _validate_or_create_directories(self, directories):
    for directory in directories:
      if not os.path.exists(directory):
        logging.info('Creating directory: %s.' % directory)
        try:
          os.makedirs(directory)
          self.directories_foreknowledge[directory] = _DIR_AGE.NEW
        except Exception, e:
          logging.error('Could not create directory (%s) because: %s.' % e)
      else:
        logging.info('Directory already exists %s. '
                     'SHOULD CHECK IF WE HAVE LOGGED STATE ABOUT DIRECTORY.' %
                     directory)
        self.directories_foreknowledge[directory] = _DIR_AGE.EXISTING
    logging.info(self.directories_foreknowledge)


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
    self.mediator.start()

    # Make sure top level directoris are okay.
    self._validate_or_create_directories(self.directories)

    observer = Observer()
    # Much verify that the roots are not included in each other.
    for root in self.directories:
      observer.schedule(self.event_handler, root, recursive=True)

    # TODO(tierney): Can we add an observer that detects tree diffs.
    observer.start()

    # Subscribe to SNS and SQS.

    # TODO(tierney): Continue running until the input says to quit.
    try:
      logging.info('Quietly looping until keyboard interrupt.')
      while True:
        time.sleep(1)
    except KeyboardInterrupt:
      logging.info('Quitting with KeyboardInterrupt.')
      logging.info('Notifying mediator.')
      self.mediator.stop()

