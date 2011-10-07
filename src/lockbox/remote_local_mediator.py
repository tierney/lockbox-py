#!/usr/bin/env python

import os
import logging
import threading
import sqlite3
import time
from file_change_status import _POSSIBLE_STATES, FileChangeStatus
from master_db_connection import MasterDBConnection
from util import enum

_DEFAULT_DATABASE_NAME = 'mediator.db'
_DEFAULT_DATABASE_DIRECTORY = os.path.join(os.path.expanduser('~'),
                                          '.lockbox')
if not os.path.exists(_DEFAULT_DATABASE_DIRECTORY):
  os.makedirs(_DEFAULT_DATABASE_DIRECTORY)


class RemoteLocalMediator(threading.Thread):
  def __init__(self, database_directory=_DEFAULT_DATABASE_DIRECTORY,
               database_name=_DEFAULT_DATABASE_NAME):
    threading.Thread.__init__(self)
    self.database_directory = database_directory
    self.database_name = database_name
    self.database_path = os.path.join(self.database_directory,
                                      self.database_name)

    self._stop = threading.Event()


  def _initialize_queue(self):
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute(
          'CREATE TABLE queue(id INTEGER PRIMARY KEY AUTOINCREMENT, '
          'status filechangestatus)')
    except sqlite3.OperationalError:
      logging.info('Already have queue table.')


  def enqueue(self, event):
    status = FileChangeStatus(time.time(), event)
    logging.info('thread id: %s' % threading.current_thread())
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('INSERT INTO queue(status) values (?)', (status,))
      return True
    except Exception, e:
      logging.error(e)
      return False

  def _list_queue(self):
    with MasterDBConnection(self.database_path) as cursor:
      results = cursor.execute('SELECT rowid, status FROM queue')
    return results.fetchall()


  def update(self, status_id, state):
    with MasterDBConnection(self.database_path) as cursor:
      cursor.execute('UPDATE queue SET state = ? WHERE rowid')


  def stop(self):
    self._stop.set()

  def run(self):
    self._initialize_queue()
    while not self._stop.is_set():
      time.sleep(1)
