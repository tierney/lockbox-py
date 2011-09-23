#!/usr/bin/env python

from Queue import Queue

class FileSystemEventQueue(object):
  def __init__(self, cloud_updater):
    self.cloud_updater = cloud_updater
    self.queue = Queue()

  def enqueue(self, item):
    self.queue.put(item)

  def dequeue(self):
    if self.queue
