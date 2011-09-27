#!/usr/bin/env python

import logging
import time
from boto import connect_sns, connect_sqs
from boto.exception import BotoServerError

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
  def __init__(self, sns_connection=None, sqs_connection=None,
               queue_name='', topic_name=''):
    self.sns_connection = sns_connection
    self.sqs_connection = sqs_connection
    self.queue_name = queue_name
    self.topic_name = topic_name


  @staticmethod
  def queue_write_message_str(queue, message_str):
    message = queue.new_message(message_str)
    queue.write(message)


  def _create_and_set_topic_arn(self, topic_name):
    topic = self.sns_connection.create_topic(topic_name)
    return topic[u'CreateTopicResponse'][u'CreateTopicResult'][u'TopicArn']


  def get_or_create_queue(self, queue_name):
    queue = self.sqs_connection.lookup(queue_name)
    if not queue:
      queue = self.sqs_connection.create_queue(queue_name)
    return queue


  def check_subscription(self, topic_arn):
    subscriptions_result = self.sns_connection.get_all_subscriptions()
    subscriptions = subscriptions_result[u'ListSubscriptionsResponse']\
        [u'ListSubscriptionsResult'][u'Subscriptions']
    for subscription_info in subscriptions:
      if topic_arn == subscription_info[u'TopicArn']:
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


  def verify_or_create_subscription(self, sns_topic_arn, sqs_queue):
    if not self.check_subscription(sns_topic_arn):
      self.sns_connection.subscribe_sqs_queue(sns_topic_arn, sqs_queue)


  def setup_connections(self):
    """Sets up the connections when not specified initially."""
    if not self.sns_connection:
      self.sns_connection = connect_sns()

    if not self.sqs_connection:
      self.sqs_connection = connect_sqs()

    if not self.sns_connection or self.sqs_connection:
      logging.error('SNS (%s) or SQS (%s) Connection not set.' %
                    (type(self.sns_connection), type(self.sqs_connection)))
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

    topic_arn = self._create_and_set_topic_arn(topic_name)
    queue = self.get_or_create_queue(queue_name)
    self.verify_or_create_subscription(topic_arn, queue)
    return True


def main():
  group_messages = GroupMessages(connect_sns(), connect_sqs(),
                                 'tierney_topic', 'tierney_queue')
  if not group_messages.setup_topic_queue():
    logging.error('Topic and queue not setup.')


if __name__=='__main__':
  main()
