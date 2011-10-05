#!/usr/bin/env python

import boto
import os
import tempfile
import time
import unittest
from lockbox.remote_local_mediator import RemoteLocalMediator, \
    FileChangeStatus, _POSSIBLE_STATES

class RemoteLocalMediatorTestCase(unittest.TestCase):
  def setUp(self):
    self.database = tempfile.NamedTemporaryFile(delete=False)

    database_directory, database_filename = os.path.split(self.database.name)
    self.mediator = RemoteLocalMediator(database_directory, database_filename)

  def tearDown(self):
    # Get rid of the temporary database.
    if os.path.exists(self.database.name):
      os.remove(self.database.name)

  def test_sqlite_adapters(self):
    mediator = self.mediator
    mediator._initialize_queue()

    fcs = FileChangeStatus(time.time(), _POSSIBLE_STATES.PREPARE, '/tmp/garbage')
    mediator.enqueue(fcs)
    mediator.enqueue(fcs)
    queue = mediator._list_queue()
    for item in queue:
      rowid = item[0]
      file_change_status = item[1]
      self.assertIsInstance(file_change_status, FileChangeStatus)


if __name__=='__main__':
  unittest.main()
