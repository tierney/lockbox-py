#!/usr/bin/env python

from boto import connect_sns, connect_sqs

class Notifier(object):
  def __init__(self):
    self.topics = {}
    self.queues = {}

