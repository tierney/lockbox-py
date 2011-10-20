#!/usr/bin/env python

import os
import logging
import threading
import sqlite3
import time
import file_change_status
import watchdog.events
from watchdog.observers import Observer
from watchdog.events import LoggingEventHandler
from file_change_status import FileChangeStatus
from local_file_shepherd import LocalFileShepherd, SHEPHERD_STATE_READY, \
    SHEPHERD_STATE_ASSIGNED, SHEPHERD_STATE_ENCRYPTING, \
    SHEPHERD_STATE_UPLOADING, SHEPHERD_STATE_SHUTDOWN
from master_db_connection import MasterDBConnection
from util import enum


_DEFAULT_DATABASE_NAME = 'mediator.db'
_DEFAULT_DATABASE_DIRECTORY = os.path.join(os.path.expanduser('~'),
                                          '.lockbox')
if not os.path.exists(_DEFAULT_DATABASE_DIRECTORY):
  os.makedirs(_DEFAULT_DATABASE_DIRECTORY)


class RemoteLocalMediator(threading.Thread):
  def __init__(self, gpg, blob_store, metadata_store,
               database_directory = _DEFAULT_DATABASE_DIRECTORY,
               database_name = _DEFAULT_DATABASE_NAME):
    threading.Thread.__init__(self)
    self.gpg = gpg
    self.blob_store = blob_store
    self.metadata_store = metadata_store
    self.database_directory = database_directory
    self.database_name = database_name
    self.database_path = os.path.join(self.database_directory,
                                      self.database_name)

    self._stop = threading.Event()
    self.shepherds = list()
    self.num_shepherds = 2
    self.file_to_shepherd = dict()
    self.observer = None

    # Directory to watchdog.observers.ObservedWatch object.
    self.observed_watches = dict()
    self.directories = list()


  def _initialize_queue(self):
    logging.info('Initializing the queue table.')
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute(
          'CREATE TABLE queue('
          'id INTEGER PRIMARY KEY AUTOINCREMENT, '
          'timestamp float, '
          'state text, '
          'event_type text, '
          'src_path text, '
          'dest_path text'
          ')')
    except sqlite3.OperationalError, e:
      logging.info('SQLite error (%s).' % e)


  def add_directory(self, directory):
    logging.info('Adding directory (%s).' % directory)
    self.directories.append(directory)

    logging.info('Stopping current observer since we are adding (%s).' %
                 directory)
    self.observer.stop()
    self.observer.join()

    logging.info('Rescheduling all old directories.')
    self.observer = Observer()
    for directory_to_schedule in self.directories:
      logging.info('Scheduling (%s).' % directory_to_schedule)
      self.observer.schedule(self.event_handler, directory_to_schedule)

    self.observer.start()


  def del_directory(self, directory):
    if directory not in self.directories:
      return False
    self.directories.remove(directory)
    return True


  def _prepare_shepherds(self):
    """Spawns the threads and puts them in a simple list that will act as our
    ThreadPool."""
    logging.info('Preparing shepherds.')
    self.shepherds = [
      LocalFileShepherd(self, self.gpg, self.blob_store, self.metadata_store)
      for shepherd_num in range(self.num_shepherds)]
    for shepherd in self.shepherds:
      shepherd.start()


  def enqueue(self, event):
    # status = FileChangeStatus(time.time(), event)
    logging.info('thread id: %s' % threading.current_thread())
    dest_path = ''
    if event.event_type == watchdog.events.EVENT_TYPE_MOVED:
      dest_path = event.dest_path

    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('INSERT INTO queue('
                       'timestamp, state, event_type, src_path, dest_path) '
                       'VALUES (?, ?, ?, ?, ?)',
                       (time.time(), 'prepare', event.event_type,
                        event.src_path, dest_path))
      return True
    except Exception, e:
      logging.error('Enqueue error: %s' % e)
      return False


  def _list_queue(self):
    with MasterDBConnection(self.database_path) as cursor:
      rows = cursor.execute('SELECT * FROM queue')
      results = rows.fetchall()
    return results


  def update(self, status_id, state):
    logging.info('Updating row %(status_id)d with %(state)s.' % locals())
    with MasterDBConnection(self.database_path) as cursor:
      cursor.execute('UPDATE queue SET state = "%s" WHERE rowid = %d' %
                     (state, status_id))


  def done(self, src_path, ident):
    assert self.file_to_shepherd[src_path] == ident
    del self.file_to_shepherd[src_path]


  def stop(self):
    self._stop.set()


  def _wip_files(self):
    """Work in Progress files."""
    files = self.file_to_shepherd.keys()
    query = ''
    for filename in files:
      query += ' AND src_path != "%s"' % filename
    logging.debug('WIP query: (%s).' % query)
    return query


  def run(self):
    self._initialize_queue()
    self._prepare_shepherds()

    while not self._stop.is_set():
      # TODO(tierney): Add a facility that checks if a shepherd has died. If so,
      # then we should restart a thread so that we can continue make progress.

      _wip_files = self._wip_files()
      with MasterDBConnection(self.database_path) as cursor:
        query = 'SELECT rowid, timestamp, state, event_type, src_path, ' \
            'dest_path FROM queue WHERE state == "prepare" %s LIMIT 1' \
            % (_wip_files)
        row = cursor.execute(query)
        result = row.fetchone()
        if not result:
          time.sleep(1)
          continue

        rowid = result[0]
        timestamp = result[1]
        state = result[2]
        event_type = result[3]
        src_path = result[4]
        dest_path = result[5]
        logging.info('selected row: (%(rowid)d, %(timestamp)f, '
                     '%(state)s, %(event_type)s, %(src_path)s, '
                     '%(dest_path)s).' % locals())

        # Assign to a thread.
        _assigned = False
        for shepherd in self.shepherds:
          if SHEPHERD_STATE_READY == shepherd.get_state():
            shepherd.assign(
              rowid, timestamp, state, event_type, src_path, dest_path)
            self.file_to_shepherd[src_path] = shepherd.ident
            logging.info(self.file_to_shepherd)
            _assigned = True
            break

        if not _assigned:
          logging.info('Unable to assign row. Going to sleep and wait'
                       'for an available thread.')
          time.sleep(1)
          continue

        cursor.execute('UPDATE queue SET state = "assigned" '
                       'WHERE rowid == %d' % (rowid))
        logging.info('updated row: (%(rowid)d, %(timestamp)f, '
                     '%(state)s, %(event_type)s, %(src_path)s, '
                     '%(dest_path)s).' % locals())

    logging.info('Shutting down shepherds.')
    for shepherd in self.shepherds:
      shepherd.shutdown()
