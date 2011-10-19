#!/usr/bin/env python

import boto
import group
import group_messages
import logging
import os
import random
import sqlite3
import sys
import time
from master_db_connection import MasterDBConnection

logging.basicConfig(level=logging.DEBUG)

_DEFAULT_DATABASE_NAME = 'groups.db'
_DEFAULT_DATABASE_DIRECTORY = os.path.expanduser('~/.lockbox')
if not os.path.exists(_DEFAULT_DATABASE_DIRECTORY):
  os.makedirs(_DEFAULT_DATABASE_DIRECTORY)


class GroupManager(object):
  """Creates groups, manages local state of group membership."""
  def __init__(self, sns_connection, sqs_connection, iam_connection,
               database_directory=_DEFAULT_DATABASE_DIRECTORY,
               database_name=_DEFAULT_DATABASE_NAME):
    assert isinstance(sns_connection, boto.sns.connection.SNSConnection)
    assert isinstance(sqs_connection, boto.sqs.connection.SQSConnection)
    assert isinstance(iam_connection, boto.iam.connection.IAMConnection)
    self.sns_connection = sns_connection
    self.sqs_connection = sqs_connection
    self.iam_connection = iam_connection
    self.database_directory = database_directory
    self.database_name = database_name
    self.database_path = os.path.join(self.database_directory,
                                      self.database_name)
    self.group_to_messages = {}


  def _initialize_groups_apparent(self):
    logging.info('Initialzing groups table.')
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('CREATE TABLE groups_apparent('
                       'group_id text, '
                       'name text, '
                       'sqs text, '
                       'sns text, '
                       'PRIMARY KEY (group_id))')
    except sqlite3.OperationalError, e:
      if 'table groups_apparent already exists' in e:
        logging.info(e)
        return
      logging.error('SQLite error (%s).' % e)


  def _initialize_groups_internal(self):
    logging.info('Initializing groups internal.')
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('CREATE TABLE groups_internal('
                       'group_id text, '
                       'human_name text, '
                       'fingerprint text, '
                       'permissions text, '
                       'PRIMARY KEY (group_id, human_name))')
    except sqlite3.OperationalError, e:
      if 'table groups_internal already exists' in e:
        logging.info(e)
        return
      logging.error('SQLite error (%s).' % e)


  def create_group(self, group_name):
    """Create a group that I will own."""
    gmsgs = group_messages.GroupMessages(
      self.sns_connection, self.sqs_connection, group_name, group_name)
    if not gmsgs.setup_topic_queue():
      logging.error('Topic and queue not setup properly')
      return False

    self.group_to_messages[group_name] = gmsgs

    # Create group on AWS IAM. 'arn:aws:iam:::group/group_name'.
    self.iam_connection.create_group(group_name)

    # Create policy for group.
    self.iam_connection.put_group_policy(group_name, 'members', json_policy)

    # Make this information locally persistent.
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('INSERT INTO groups_apparent(group_id, name, sqs, sns) '
                       'VALUES (?, ?, ?, ?)', (group_name, group_name,
                                               group_name, group_name))
    except sqlite3.OperationalError, e:
      logging.error(e)
      return False

    return True


  def join_group(self, user_name, group_name, more_info):
    # TODO(tierney): Check that group exists.
    self.iam_connection.add_user_to_group(user_name, group_name)


  def delete_group(self, name_prefix):
    if not name_prefix in self.group_to_messages:
      return False

    gms = self.group_to_messages.get(name_prefix)
    # Fit this into a retry decorator (e.g., util.retry).
    retries = 3
    while retries > 0:
      if gms.delete():
        break
      sleep_duration = random.randint(2, 5)
      logging.warning('Could not delete group (%s) so sleeping %d sec. '
                      '%d retries remain.' %
                      (name_prefix, sleep_duration, retries))
      time.sleep(sleep_duration)
      retries -= 1

    del self.group_to_messages[name_prefix]
    return True
