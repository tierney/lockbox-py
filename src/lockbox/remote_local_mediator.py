#!/usr/bin/env python

import os
import logging
import threading
import sqlite3
from util import enum

_DEFAULT_DATABASE_NAME = 'mediator.db'
_DEFAULT_DATABASE_DIRECTORY = os.path.join(os.path.expanduser('~'),
                                          '.lockbox')
if not os.path.exists(_DEFAULT_DATABASE_DIRECTORY):
  os.makedirs(_DEFAULT_DATABASE_DIRECTORY)


_POSSIBLE_STATES = enum('PREPARE', 'CANCELED', 'UPLOADING', 'FAILED')

class FileChangeStatus(object):
  def __init__(self, timestamp, state, filepath):
    assert isinstance(timestamp, float)
    self.timestamp = timestamp
    self.state = state
    self.filepath = filepath


  def __conform__(self, protocol):
    if protocol is sqlite3.PrepareProtocol:
      return '%f;%d;%s' % (self.timestamp, self.state, self.filepath)

  def __repr__(self):
    return '(%f;%d;%s)' % (self.timestamp, self.state, self.filepath)


def adapt_file_change_status(file_change_status):
  return '%f;%d;%s' % (file_change_status.timestamp,
                       file_change_status.state,
                       file_change_status.filepath)


def convert_file_change_status(string):
  untyped_timestamp, untyped_state, untyped_filepath = string.split(';')

  return FileChangeStatus(
    float(untyped_timestamp), int(untyped_state), str(untyped_filepath))

sqlite3.register_adapter(FileChangeStatus, adapt_file_change_status)
sqlite3.register_converter('filechangestatus', convert_file_change_status)


class RemoteLocalMediator(threading.Thread):
  def __init__(self, database_directory=_DEFAULT_DATABASE_DIRECTORY,
               database_name=_DEFAULT_DATABASE_NAME):
    threading.Thread.__init__(self)
    self.database_directory = database_directory
    self.database_name = database_name
    self.database_path = os.path.join(self.database_directory,
                                      self.database_name)

    self._stop = threading.Event()
    self.queue_conn = sqlite3.connect(self.database_path,
                                      detect_types=sqlite3.PARSE_DECLTYPES)

  def _initialize_queue(self):
    self.queue_conn.execute(
      'CREATE TABLE queue(id INTEGER PRIMARY KEY AUTOINCREMENT, '
      'status filechangestatus)')


  def enqueue(self, status):
    try:
      self.queue_conn.execute('INSERT INTO queue(status) values (?)', (status,))
      return True
    except Exception, e:
      logging.error(e)
      return False

  def _list_queue(self):
    results = self.queue_conn.execute('SELECT rowid, status FROM queue')
    return results.fetchall()


  def update(self, status_id, state):
    self.queue_conn.execute('UPDATE queue SET state = ? WHERE rowid')


  def stop(self):
    self._stop.set()


  def run(self):
    while not self._stop.is_set():
      pass




