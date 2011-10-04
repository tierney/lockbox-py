#!/usr/bin/env python

import boto
import logging
import notifications
import threading
import time

from notifications import NotificationSerializer as MessageSerializer

_POLLING_INTERVAL = 3

class RemoteObserver(threading.Thread):
  def __init__(self, group_manager, group_id, remote_local_mediator,
               polling_interval=_POLLING_INTERVAL):
    threading.Thread.__init__(self)
    self.group_manager = group_manager
    self.group_id = group_id
    self.remote_local_mediator = remote_local_mediator
    self.polling_interval = polling_interval
    self._stop = False


  def polling_interval(self, value=None):
    if value:
      self.polling_interval = value
    return self.polling_interval


  def stop(self):
    self._stop.set()


  def run(self):
    group = self.group_manager.get(self.group_id)
    while not self._stop.is_set():
      message = group.receive()

      # If we did not get a real message, wait the polling interval number of
      # seconds.
      if not message:
        time.sleep(self.polling_interval)
        continue

      # Got a real message.
      notification = MessageSerializer.deserialize(message.get_body())
      logging.info('Got the following: (%s).' % notification)

      # TODO(tierney): Log the message in a persistent database. This may mean
      # just passing the message to another object that returns only when we
      # have logged the value.

      # Delete the message since we can process it now.
      if not group.delete(message):
        logging.error('RemoteObserver was not able to delete message with body'
                      'notification (%s).' % (notification))

    logging.info('RemoteObserver Shutting down.')
