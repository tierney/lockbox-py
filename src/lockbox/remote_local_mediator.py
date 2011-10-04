#!/usr/bin/env python

import os
import logging
import threading
import sqlite3

_DEFAULT_DATABASE_DIRECTORY = os.path.join(os.path.expanduser('~'),
                                          '.lockbox')
if not os.path.exists(_DEFAULT_DATABASE_DIRECTORY):
  os.makedirs(_DEFAULT_DATABASE_DIRECTORY)


_POSSIBLE_STATES = enumlist('PREPARE', 'CANCELED', 'UPLOADING', 'FAILED')


class FileChangeStatus(object):
  def __init__(self, timestamp, state, filepath):
    assert isinstance(timestamp, float)
    self.timestamp = timestamp
    self.state = state
    self.filepath = filepath


  def __conform__(self, protocol):
    if protocol is sqlite3.PrepareProtocol:
      return '%f;%d;%s' % (file_change_status.timestamp,
                           file_change_status.state,
                           file_change_status.filepath)


  def __repr__(self):
    return '(%f;%d;%s)' % (self.timestamp, self.state, self.filepath)


class RemoteLocalMediator(threading.Thread):
  def __init__(self, database_directory=_DEFAULT_DATABASE_DIRECTORY):
    threading.Thread.__init__(self)
    self.database_directory = database_directory
    self.database_path = os.path.join(self.database_directory, 'mediator.db')

    self._stop = threading.Event()
    self.queue_conn = sqlite3.connect(self.database_path)

  def _initialize_queue(self):
    self.queue_conn.execute(
      'CREATE TABLE queue(id INTEGER PRIMARY KEY AUTOINCREMENT, '
      'status filechangestatus)')


  def enqueue(self, status):
    self.queue_conn.execute(
      'INSERT INTO queue(NULL, status) values (?)', (status,))


  def update(self, status_id, state):
    self.queue_conn.execute('UPDATE queue SET state = ? WHERE rowid')


  def stop(self):
    self._stop.set()


  def run(self):
    while not self._stop.is_set():



