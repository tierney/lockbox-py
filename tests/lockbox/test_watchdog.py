#!/usr/bin/env python

__author__ = 'tierney@cs.nyu.edu (Matt Tierney)'

import logging
import os
import sys
import tempfile
import time
import unittest
from lockbox.event_handler import LockboxEventHandler
from watchdog.observers import Observer
from watchdog.events import LoggingEventHandler
from watchdog.utils.dirsnapshot import DirectorySnapshot, DirectorySnapshotDiff


logging.basicConfig()


class WatchdogTestCase(unittest.TestCase):
  def setUp(self):
    pass


  def tearDown(self):
    pass


  def test_watchdog(self):
    file_path = './'

    lockbox_event_handler = LockboxEventHandler()
    logging_event_handler = LoggingEventHandler()

    observer = Observer()
    lockbox_watch = observer.schedule(lockbox_event_handler,
                                      file_path,
                                      recursive=True)
    logging_watch = observer.schedule(logging_event_handler,
                                      file_path,
                                      recursive=True)
    observer.start()

    # (delete = False) parameter allows us to close the file and move it around
    # for the filesystem.
    temporary_file = tempfile.NamedTemporaryFile(dir=file_path, delete=False)

    os.rename(temporary_file.name, temporary_file.name + '.moved')
    os.rename(temporary_file.name + '.moved', temporary_file.name)

    # Take the snapshot in order to catch the special case in which watchdog
    # fails to detect the file move.
    snapshot_pre = DirectorySnapshot(file_path)
    os.rename(temporary_file.name,
              os.path.join(os.environ['HOME'], 'toss.moved'))
    snapshot_post = DirectorySnapshot(file_path)
    directory_snapshot_diff = DirectorySnapshotDiff(snapshot_pre, snapshot_post)
    # Note that a move out of the watched file path is considered a delete.
    assert temporary_file.name in directory_snapshot_diff.files_deleted

    os.rename(os.path.join(os.environ['HOME'],'toss.moved'),
              file_path + '/toss.moved.again')
    os.rename(os.path.join(file_path, 'toss.moved.again'),
              temporary_file.name + '.final')
    os.remove(temporary_file.name + '.final')

    # Sometimes this call (and generally shutting down the watchdog) will throw
    # exceptions. Since this only affects shutdown operations, we probably do
    # not need to be too worried for now.
    observer.stop()
    observer.join()


if __name__ == '__main__':
  unittest.main()

