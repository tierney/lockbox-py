#!/usr/bin/env python

import boto
import logging
import sqlite3
import os
import time
from gnupg import GPG
from master_db_connection import MasterDBConnection

_DEFAULT_DATABASE_NAME = 'users.db'
_DEFAULT_DATABASE_DIRECTORY = os.path.join(os.path.expanduser('~'), '.lockbox')
if not os.path.exists(_DEFAULT_DATABASE_DIRECTORY):
  os.makedirs(_DEFAULT_DATABASE_DIRECTORY)

class Users(object):
  def __init__(self, iam_connection, gpg,
               database_directory=_DEFAULT_DATABASE_DIRECTORY,
               database_name=_DEFAULT_DATABASE_NAME):
    assert isinstance(iam_connection, boto.iam.connection.IAMConnection)
    assert isinstance(gpg, GPG)
    self.iam_connection = iam_connection
    self.gpg = gpg
    self.database_directory = database_directory
    self.database_name = database_name
    self.database_path = os.path.join(self.database_directory,
                                      self.database_name)

    # TODO(tierney): Call these methods from a separate driver method so that
    # if we have an actual problem, then we can handle the error separate from
    # initialization of the class. 
    self._initialize_aws_users_table()
    self._initialize_users_keys_table()


  def _initialize_aws_users_table(self):
    logging.info('Initializing aws_users table.')
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('CREATE TABLE aws_users('
                       'user_name text, '
                       'aws_access_key_id text, '
                       'aws_secret_access_key text, '
                       'PRIMARY KEY (user_name))')
      return True
    except sqlite3.OperationalError, e:
      if 'table aws_users already exists' in e:
        logging.info(e)
        return True
      logging.error('SQLite error (%s).' % e)
      return False


  def _initialize_users_keys_table(self):
    logging.info('Initializing users_keys table.')
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('CREATE TABLE users_keys('
                       'user_name text, '
                       'fingerprint text, '
                       'PRIMARY KEY (user_name))')
      return True
    except sqlite3.OperationalError, e:
      if 'table users_key already exists in e':
        logging.info(e)
        return True
      logging.error('SQLite error (%s).' % e)
      return False


  def _choose_fingerprint(self, important_keys_values):
    # Prompt user with ability to choose the appropriate key for a given
    # user_name.
    for uids, date, expires, fingerprint, keyid in important_keys_values:
      if 'Matt Tierney' in " ".join(uids):
        if expires < time.time():
          logging.warning('Not including expired key (%s).' % fingerprint)
          continue
        return fingerprint
    logging.warning('No matching key.')
    return None


  def create_user(self, user_name):
    # Expect to receive a list of (user_name, fingerprint) tuples.

    all_keys = self.gpg.list_keys()
    important_keys_values = [
      (key['uids'], key['date'], key['expires'], key['fingerprint'],
       key['keyid']) for key in all_keys]

    fingerprint = self._choose_fingerprint(important_keys_values)
    if not fingerprint:
      return False

    return self._create_user(user_name.replace(' ', '_'), fingerprint)


  def _create_user(self, user_name, fingerprint):
    # TODO(tierney): Check if user_name already exists.
    try:
      resp = self.iam_connection.create_user(user_name)
    except boto.exception.BotoServerError, e:
      logging.error(e)
      return False

    # Create the user on the AWS IAM.
    try:
      resp = self.iam_connection.create_access_key(user_name)
    except Exception, e:
      logging.error('FIX CODE with more specific exception handling (%s).' % e)
      return False

    try:
      access_key = resp['create_access_key_response']['create_access_key_result'
                                                      ]['access_key']
    except Exception, e:
      logging.error('FIX CODE with more specific exception handling (%s).' % e)
      return False

    access_key_id = access_key['access_key_id']
    secret_access_key = access_key['secret_access_key']

    # Persist the data in our own local database.
    logging.info('Keys generated for user_name (%s) are (%s) and (%s).' %
                 (user_name, access_key_id, secret_access_key))
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('INSERT INTO aws_users(user_name, aws_access_key_id,'
                       'aws_secret_access_key) VALUES (?, ?, ?)',
                       (user_name, access_key_id, secret_access_key))
      return True
    except sqlite3.OperationalError, e:
      logging.error('UNABLE TO PERSIST keys!')
      logging.error(e)
      return False


  def _lookup_user_access_key(self, user_name):
    try:
      with MasterDBConnection(self.database_path) as cursor:
        result = cursor.execute('SELECT aws_access_key_id FROM aws_users WHERE '
                                'user_name = ?', (user_name,))
        access_key_id = result.fetchone()[0]
        return access_key_id
    except sqlite3.OperationalError, e:
      logging.error('Unable to retrieve user (%s) from local database (%s).' %
                    (user_name, e))
      return None


  def _delete_aws_user_entry(self, user_name, access_key_id):
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('DELETE FROM aws_users WHERE user_name = ? AND '
                       'aws_access_key_id = ?', (user_name, access_key_id))
      return True
    except sqlite3.OperationalError, e:
      logging.error('Unable to delete local aws_user entry for user (%s).' %
                    user_name)
      return False


  def delete_user(self, user_name):
    access_key_id = self._lookup_user_access_key(user_name)
    if not access_key_id:
      logging.error('Not able to find locally stored access key so we cannot '
                    'delete user (%s).' % user_name)

    resp = self.iam_connection.delete_access_key(access_key_id,
                                                 user_name=user_name)
    logging.info('Delete access key response (%s).' % resp)

    resp = self.iam_connection.delete_user(user_name)
    logging.info('Delete user response (%s).' % resp)

    # Delete from local database too.
    return self._delete_aws_user_entry(user_name, access_key_id)

