#!/usr/bin/env python

import logging
import time
from boto import connect_sns, connect_sqs
from boto.exception import BotoServerError

def _print_dict(dictionary, spaces=''):
  for key in dictionary:
    print '%s%s:' % (spaces, key)
    val = dictionary.get(key)
    if isinstance(val, dict):
      _print_dict(val, spaces + '  ')
    else:
      print '%s%s' % (spaces + '  ', val)


class Notifier(object):
  def __init__(self, sns_connection, sqs_connection):
    self.sns_connection = sns_connection
    self.sqs_connection = sqs_connection
    self.topics = {}
    self.queues = {}
    self.topic_arn = ''


  def _create_topic_set_arn(self, topic_name):
    topic = self.sns_connection.create_topic(topic_name)
    self.topic_arn = \
        topic[u'CreateTopicResponse'][u'CreateTopicResult'][u'TopicArn']

  @staticmethod
  def _queue_write_message_str(queue, message_str):
    message = queue.new_message(message_str)
    queue.write(message)

  def setup_topic_queue(self, topic_name, queue_name):
    self._create_topic_set_arn(topic_name)

    queue = self.sqs_connection.lookup(queue_name)
    if not queue:
      queue = self.sqs_connection.create_queue(queue_name)

    self._queue_write_message_str(queue, 'hello, tierney. 3')

    # Eventually-consistent messaging system.
    # time.sleep(3)
    msgs = self.sqs_connection.receive_message(queue, number_messages=10)
    print '--'
    if msgs:
      for msg in msgs:
        print 'found it!:', msg.get_body()
        if not queue.delete_message(msg):
          logging.error('Could not delete message: (%s).' % msg.get_body())
    else:
      print 'No messages.'

    try:
      dictionary = self.sns_connection.get_all_subscriptions()
      print 'subs:'
      _print_dict(dictionary)
      # self.sns_connection.subscribe_sqs_queue(self.topic_arn, queue)
    except BotoServerError, e:
      logging.error('my try:' + str(e))


def main():
  sns = connect_sns()
  sqs = connect_sqs()
  n = Notifier(sns, sqs)
  n.setup_topic_queue('tierney_topic', 'tierney_queue')

if __name__=='__main__':
  main()
