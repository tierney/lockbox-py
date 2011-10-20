'''
Created on Oct 20, 2011

@author: tierney
'''

import logging
import os
import threading
from exception import AlreadyEncapsulatedDirectoryError, AlreadyWatchedDirectoryError
from master_db_connection import MasterDBConnection

class GroupDirectories(object):
  def __init__(self, database_directory):
    self.database_directory = database_directory
    self.database_name = 'group_directories.db'
    self.database_path = os.path.join(self.database_directory,
                                      self.database_name)
    self._lock = threading.Lock()


  def _initialize_database(self):
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('CREATE TABLE group_directories('
                       'group_id text, '
                       'directory text)')
    except Exception, e:
      logging.error('Creating database error (%s).' % e)
      raise


  def _validate_directory(self, directory):
    """Validates directory with two rules: (1) Not already tracking the
    directory and (2) the directory is not already a subdirectory of an
    already-shared group."""
    with MasterDBConnection(self.database_path) as cursor:
      results = cursor.execute('SELECT directory FROM group_directories')
      directories = results.fetchall()

    if directory in directories:
      logging.warning('Already watching this directory (%s).' % (directory))
      raise AlreadyWatchedDirectoryError
    for watched_directory in directories:
      if directory in watched_directory:
        logging.warning('Known directory (%s) already encapsulates this '
                        'directory (%s).' % (watched_directory, directory))
        raise AlreadyEncapsulatedDirectoryError


  def add_directory_to_group(self, directory, group_id):
    self._lock.acquire()
    try:
      self._validate_directory(directory)
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('INSERT INTO group_directories(group_id, directory) '
                       'VALUES (?, ?)', (group_id, directory))
    except AlreadyEncapsulatedDirectoryError:
      raise
    except AlreadyWatchedDirectoryError:
      raise
    except Exception, e:
      logging.error('Unspecified exception: %s.' % e)
      raise
    finally:
      self._lock.release()


  def delete_directory_from_group(self, directory, group_id):
    self._lock.acquire()
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('DELETE FROM group_directories WHERE group_id = ? AND '
                       'directory = ?')
    except Exception, e:
      logging.error('Deleting group failed (%s).' % e)
      raise
    finally:
      self._lock.release()
