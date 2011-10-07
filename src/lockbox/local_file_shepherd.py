#!/usr/bin/env python

import logging
import threading
import time
from util import enum

_SHEPHERD_STATE = enum('READY', 'ASSIGNED', 'ENCRYPTING', 'UPLOADING',
                       'SHUTDOWN')

class LocalFileShepherd(threading.Thread):
  def __init__(self, remote_local_mediator, file_update_crypto,
               update_cloud_file):
    threading.Thread.__init__(self)
    self.remote_local_mediator = remote_local_mediator
    self.file_update_crypto = file_update_crypto
    self.update_cloud_file = update_cloud_file
    self.state = _SHEPHERD_STATE.READY


  def shutdown(self):
    # TODO(tierney): Call the MultiPartUpload cancel.
    logging.info('shutdown not implemented.')
    self.state = _SHEPHERD_STATE.SHUTDOWN


  def assign(self, filepath, base_file, prev_hash):
    self.state = _SHEPHERD_STATE.ASSIGNED
    # filepath =


  def get_state(self):
    return self.state


  def run(self):
    while self.state is not _SHEPHERD_STATE.SHUTDOWN:
      time.sleep(1)
