#!/usr/bin/env python

import logging
import threading
from util import enum

_SHEPHERD_STATE = enum('INIT', 'HASHING', 'ENCRYPTING', 'UPLOADING', 'CANCELED')

class LocalFileShepherd(threading.Thread):
  def __init__(self, remote_local_mediator, hashing,
               hybrid_cryptosystem, uploader, ):
    threading.Thread.__init__(self)
    self.remote_local_mediator = remote_local_mediator
    self.hashing = hashing
    self.hybrid_cryptosystem = hybrid_cryptosystem
    self.uploader = uploader
    self.state = _SHEPHERD_STATE.INIT


  def shutdown(self):
    # TODO(tierney): Call the MultiPartUpload cancel.
    logging.info('shutdown not implemented.')
    self.state = _SHEPHERD_STATE.CANCELED


  def get_state(self):
    return self.state


  def run(self):
    pass

