#!/usr/bin/env python

import logging
import time
import boto
from boto import connect_sns, connect_sqs
from boto.exception import BotoServerError
from util import retry

logging.basicConfig(level=logging.DEBUG)


def _print_dict(dictionary, spaces=''):
  for key in dictionary:
    print '%s%s:' % (spaces, key)
    val = dictionary.get(key)
    if isinstance(val, dict):
      _print_dict(val, spaces + '  ')
    else:
      print '%s%s' % (spaces + '  ', val)


class GroupMessages(object):
  def __init__(self, sns_connection, sqs_connection,
               queue_name='', topic_name=''):
    assert isinstance(sns_connection, boto.sns.connection.SNSConnection)
    assert isinstance(sqs_connection, boto.sqs.connection.SQSConnection)

    self.sns_connection = sns_connection
    self.sqs_connection = sqs_connection
    self.topic_name = topic_name
    self.queue_name = queue_name
    self.topic_arn = None
    self.queue = None


  @staticmethod
  def queue_write_message_str(queue, message_str):
    message = queue.new_message(message_str)
    queue.write(message)


  def _create_and_set_topic_arn(self, topic_name):
    topic = self.sns_connection.create_topic(topic_name)
    self.topic_arn =\
        topic[u'CreateTopicResponse'][u'CreateTopicResult'][u'TopicArn']


  def add_user(self, user):
    pass


  def remove_user(self, user):
    pass


  def publish(self, message_str):
    assert self.topic_arn
    if not isinstance(message_str, unicode):
      message_str = unicode(message_str)
    self.sns_connection.publish(self.topic_arn, message_str)


  def receive(self):
    assert self.queue
    return self.queue.read()


  def delete(self, message):
    assert isinstance(message, boto.sqs.message.Message)
    if not self.queue.delete_message(message):
      logging.error('Unable to delete message (%s).' % (message.get_body())).
      return False
    return True


  def get_or_create_queue(self, queue_name):
    try:
      self.queue = self.sqs_connection.lookup(queue_name)
      if not self.queue:
        self.queue = self.sqs_connection.create_queue(queue_name)
      return True
    except Exception, e:
      logging.error(e)
      return False


  def delete(self):
    if self.sqs_connection.lookup(self.queue.name):
      self.sqs_connection.delete_queue(self.queue, force_deletion=True)
    else:
      logging.warning('Could not find the queue to delete (%s).' % (self.queue.name))

    self.sns_connection.delete_topic(self.topic_arn)
    return True


  def check_subscription(self):
    subscriptions_result = self.sns_connection.get_all_subscriptions()
    subscriptions = subscriptions_result[u'ListSubscriptionsResponse']\
        [u'ListSubscriptionsResult'][u'Subscriptions']
    for subscription_info in subscriptions:
      if self.topic_arn == subscription_info[u'TopicArn']:
        return True
    return False


  def receive_and_delete_message(self, queue):
    """Receive a message and delete it immediately. Refrain from using this
    method since the message state may not handled appropriately. How do we
    ensure idempotency?"""
    messages = self.sqs_connection.receive_message(queue)
    if not messages:
      return None
    if len(messages) > 1:
      logging.error('boto might be broken: Asked for one queue message but '
                    'got multiple (%d)' % len(messages))
    message = messages[0]
    message_ret = message.get_body()
    queue.delete_message(message)
    return message_ret


  def receive_and_delete_messages(queue, number_messages):
    # TODO(tierney): This is more of a hack cut-and-paste job to save some code
    # that might be useful for debugging later.
    msgs = self.sqs_connection.receive_message(queue, number_messages)
    print '--'
    if msgs:
      for msg in msgs:
        print 'found it!:', msg.get_body()
        if not queue.delete_message(msg):
          logging.error('Could not delete message: (%s).' % msg.get_body())
    else:
      print 'No messages.'


  @retry(3)
  def _verify_or_create_subscription(self):
    assert self.topic_arn
    assert self.queue
    if not self.check_subscription():
      try:
        self.sns_connection.subscribe_sqs_queue(self.topic_arn, self.queue)
      except boto.exception.SQSError:
        return False
    return True


  def setup_topic_queue(self, topic_name='', queue_name=''):
    if not topic_name:
      topic_name = self.topic_name
    if not queue_name:
      queue_name = self.queue_name
    if not topic_name or not queue_name:
      logging.error('Either topic_name (%s) or queue_name (%s) not set.' %
                    (topic_name, queue_name))
      return False

    self._create_and_set_topic_arn(topic_name)
    if not self.get_or_create_queue(queue_name):
      logging.error('queue_name not set (%s).' % (queue_name))
      return False
    self._verify_or_create_subscription()
    return True


def main():
  group_messages = GroupMessages(connect_sns(), connect_sqs(),
                                 'tierney_topic', 'tierney_queue')
  if not group_messages.setup_topic_queue():
    logging.error('Topic and queue not setup.')


if __name__=='__main__':
  main()
