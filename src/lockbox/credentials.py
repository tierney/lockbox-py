#!/usr/bin/env python

import logging
import os
import sqlite3
from master_db_connection import MasterDBConnection

_DEFAULT_DATABASE_NAME = 'credentials.db'
_DEFAULT_DATABASE_DIRECTORY = os.path.join(os.path.expanduser('~'), '.lockbox')
if not os.path.exists(_DEFAULT_DATABASE_DIRECTORY):
  os.makedirs(_DEFAULT_DATABASE_DIRECTORY)

_PERMISSIONS = ['OWNER', 'RW', 'RO']

class Credentials(object):
  def __init__(self, database_name=_DEFAULT_DATABASE_NAME,
               database_directory=_DEFAULT_DATABASE_DIRECTORY):
    self.database_name = database_name
    self.database_directory = database_directory
    self.database_path = os.path.join(self.database_directory,
                                      self.database_name)
    self._initialize_credentials_table()


  def _initialize_credentials_table(self):
    logging.info('Initializing credentials table.')
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('CREATE TABLE credentials('
                       'group_name text NOT NULL,'
                       'region text NOT NULL, '
                       'namespace text NOT NULL, '
                       'aws_access_key_id text NOT NULL, '
                       'aws_secret_access_key text NOT NULL, '
                       'permissions text NOT NULL, '
                       'PRIMARY KEY (group_name))')
        return True
    except sqlite3.OperationalError, e:
      if 'table credentials already exists' in e:
        logging.info(e)
        return True
      logging.error('SQLite error (%s).' % e)
      return False


  def set(self, group_name, region, namespace, aws_access_key_id,
          aws_secret_access_key, permissions):
    logging.info('Setting credentials %(group_name)s, %(region)s, '
                 '%(namespace)s, %(aws_access_key_id)s, '
                 '%(aws_secret_access_key)s, %(permissions)s.' % locals())
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('INSERT OR REPLACE INTO credentials(group_name, '
                       'region, namespace, aws_access_key_id, '
                       'aws_secret_access_key, permissions) VALUES'
                       '(?, ?, ?, ?, ?, ?)',
                       (group_name, region, namespace, aws_access_key_id,
                        aws_secret_access_key, permissions))
      return True
    except sqlite3.OperationalError, e:
      logging.error('Unable to store credentials for group (%s).' % group_name)
      return False


  def owner(self):
    logging.info('Retrieving groups of which I am the owner.')
    try:
      with MasterDBConnection(self.database_path) as cursor:
        results = cursor.execute('SELECT group_name, aws_access_key_id,'
                                 'aws_secret_access_key FROM credentials '
                                 'WHERE permissions LIKE "OWNER"')
        if not results:
          return None
        response = result.fetchall()
        return response
    except sqlite3.OperationalError, e:
      logging.error('Not able to query for groups that I own.')
      return None


  def get(self, group_name):
    try:
      with MasterDBConnection(self.database_path) as cursor:
        results = cursor.execute('SELECT group_name, region, namespace, '
                                 'aws_access_key_id, aws_secret_access_key, '
                                 'permissions FROM credentials WHERE '
                                 'group_name = ?', (group_name,))
        if results:
          return results.fetchone()
        return None
    except sqlite3.OperationalError, e:
      logging.error('Unable to find group (%s).' % group_name)
      return None


  def delete(self, group_name):
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('DELETE FROM credentials WHERE group_name = ?',
                       (group_name,))
      return True
    except sqlite3.OperationalError, e:
      logging.error('Unable to delete credentials for group (%s).' % group_name)
      return False
