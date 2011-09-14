#!/usr/bin/env python
"""Not thread-safe."""

from binascii import b2a_base64
from M2Crypto.Rand import rand_bytes
from threading import Thread

class ObjectNameManager(Thread):
  def __init__(self, object_names):
    """Assume that incoming object_names is a list of the names known in the
    cloud store already."""
    Thread.__init__(self)
    self.object_names = dict()
    for name in object_names:
      self.object_names[name] = True

  def get_new_name(self):
    keys = self.object_names.keys()
    while True:
      candidate = b2a_base64(rand_bytes(128))
      if candidate in :
        continue
      self.object_names[name] = False

  def confirm_new_name(self, name):
    assert name in self.object_names
    assert False == self.object_names.get(name)
    self.object_names[name] = True

  def delete_name(self, name):
    assert name in self.object_names
    assert True == self.object_names.get(name)

