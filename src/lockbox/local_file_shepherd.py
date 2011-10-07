#!/usr/bin/env python

import logging
import threading
from random import randint
import time
from file_change_status import STATUS_PREPARE, STATUS_CANCELED, \
    STATUS_UPLOADING, STATUS_FAILED, STATUS_COMPLETED, STATUS_ENCRYPTING
from util import enum


SHEPHERD_STATE_READY = 'ready'
SHEPHERD_STATE_ASSIGNED = 'assigned'
_SHEPHERD_STATE_ASSIGNED_AND_READY = 'assigned_and_ready'
SHEPHERD_STATE_ENCRYPTING = 'encrypting'
SHEPHERD_STATE_UPLOADING = 'uploading'
SHEPHERD_STATE_SHUTDOWN = 'shutdown'


class LocalFileShepherd(threading.Thread):
  def __init__(self, mediator):
    threading.Thread.__init__(self)
    self.mediator = mediator
    # self.file_update_crypto = file_update_crypto
    # self.update_cloud_file = update_cloud_file
    self.state = SHEPHERD_STATE_READY


  def shutdown(self):
    # TODO(tierney): Call the MultiPartUpload cancel.
    logging.info('Shutdown not fully implemented.')
    self.state = SHEPHERD_STATE_SHUTDOWN


  def _lookup_previous(self):
    pass


  def assign(self, status_id, timestamp, state, event_type, src_path,
             dest_path):
    self.state = SHEPHERD_STATE_ASSIGNED
    self.status_id = status_id
    self.timestamp = timestamp
    self.state = state
    self.event_type = event_type
    self.src_path = src_path
    self.dest_path = dest_path
    self.state = _SHEPHERD_STATE_ASSIGNED_AND_READY

  def get_state(self):
    return self.state


  def _clear(self):
    del self.status_id, self.timestamp, self.state, self.event_type, \
        self.src_path, self.dest_path


  def run(self):
    while self.state is not SHEPHERD_STATE_SHUTDOWN:
      if self.state is SHEPHERD_STATE_READY:
        time.sleep(1)
        continue

      if self.state is _SHEPHERD_STATE_ASSIGNED_AND_READY:
        logging.info('Got event (%d, %f, %s, %s, %s, %s).'
                     % (self.status_id, self.timestamp, self.state,
                        self.event_type, self.src_path, self.dest_path))
        logging.info('Time to encrypt.')
        self.mediator.update(self.status_id, STATUS_ENCRYPTING)
        self.state = SHEPHERD_STATE_ENCRYPTING


      if self.state is SHEPHERD_STATE_ENCRYPTING:
        logging.info('Encrypting.')
        time.sleep(randint(1, 5))
        logging.info('Finished encrypting.')
        self.mediator.update(self.status_id, STATUS_UPLOADING)
        self.state = SHEPHERD_STATE_UPLOADING


      if self.state is SHEPHERD_STATE_UPLOADING:
        logging.info('Uploading.')
        time.sleep(randint(1, 5))
        logging.info('Done.')
        self.mediator.update(self.status_id, STATUS_COMPLETED)
        self.mediator.done(self.src_path, self.ident)
        self._clear()

        self.state = SHEPHERD_STATE_READY

