#!/usr/bin/env python

import boto
import group
import group_messages
import logging
import random
import sys
import time

logging.basicConfig(level=logging.DEBUG)


class GroupManager(object):
  """Creates groups, manages local state of group membership."""
  def __init__(self, sns_connection, sqs_connection):
    assert isinstance(sns_connection, boto.sns.connection.SNSConnection)
    assert isinstance(sqs_connection, boto.sqs.connection.SQSConnection)
    self.sns_connection = sns_connection
    self.sqs_connection = sqs_connection
    self.group_to_messages = {}


  def create_group(self, name_prefix):
    """Create a group that I will own."""
    gmsgs = group_messages.GroupMessages(
      self.sns_connection, self.sqs_connection, name_prefix, name_prefix)
    if not gmsgs.setup_topic_queue():
      logging.error('Topic and queue not setup properly')
      return False

    self.group_to_messages[name_prefix] = gmsgs
    # TODO(tierney): Serialize and save this information somewhere persistent.

    return True

  def join_group(self, name_prefix, address, more_info):
    pass


  def delete_group(self, name_prefix):
    if not name_prefix in self.group_to_messages:
      return False

    gms = self.group_to_messages.get(name_prefix)
    # Fit this into a retry decorator (e.g., util.retry).
    retries = 3
    while retries > 0:
      if gms.delete():
        break
      sleep_duration = random.randint(2,5)
      logging.warning('Could not delete group (%s) so sleeping %d sec. '
                      '%d retries remain.' %
                      (name_prefix, sleep_duration, retries))
      time.sleep(sleep_duration)
      retries -= 1

    del self.group_to_messages[name_prefix]
    return True
