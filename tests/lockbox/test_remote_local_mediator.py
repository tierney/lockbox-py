#!/usr/bin/env python

import boto
import os
import tempfile
import time
import unittest
from lockbox.remote_local_mediator import RemoteLocalMediator

import lockbox.file_change_status
from lockbox.file_change_status import FileChangeStatus
from watchdog.events import FileMovedEvent

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

    event = FileMovedEvent('/tmp/src', '/tmp/dest')
    fcs = FileChangeStatus(time.time(), event)
    self.assertTrue(mediator.enqueue(fcs))
    self.assertTrue(mediator.enqueue(fcs))
    queue = mediator._list_queue()
    for item in queue:
      rowid = item[0]
      file_change_status = item[1]
      self.assertIsInstance(file_change_status, FileChangeStatus)


if __name__=='__main__':
  unittest.main()
