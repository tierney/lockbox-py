#!/usr/bin/env python

import boto
import logging
import sqlite3
from gpg import GnuPG

class Users(object):
  def __init__(self, iam_connection, gpg):
    assert isinstance(iam_connection, boto.iam.connection.IAMConnection)
    assert isinstance(gpg, GnuPG)
    self.iam_connection = iam_connection
    self.gpg = gpg


  def _choose_fingerprint(self, fingerprints):
    if not fingerprints:
      fingerprints = self.gpg.keys()

    # Prompt user with ability to choose the appropriate key for a given 
    # user_name.
    return fingerprints[0][1]


  def create_user(self, user_name):
    # Expect to receive a list of (user_name, fingerprint) tuples.
    fingerprints = self.gpg.lookup_name(user_name)
    fingerprint = self._choose_fingerprint(fingerprints)


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
        cursor.execute('INSERT INTO generated_members VALUES (?, ?, ?, ?)',
                       (user_name, fingerprint, access_key_id,
                        secret_access_key))
    except sqlite3.OperationalError, e:
      logging.error(e)
      return False


