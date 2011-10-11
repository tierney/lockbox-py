#!/usr/bin/env python
"""Metadata store interface (AWS SimpleDB).

Here is the assumed layout of the SimpleDB domains.

Lock Domain.
<object_path_hash>-lock-<lock_id> : <lock_id>, <user>, <timestamp>

Data Domain.
<object_path_hash> : [ (<PGP object SHA1>, <previous PGP object SHA1.) ]

TODO(tierney): Should address 503 service unavailable errors that we may get
from boto SimpleDB.

Aim for lock-based concurrency serializability since we do not assume the
possiblity of a Multiversion Concurrency Control system to sweep and detect
conflicts.: If built on multiversion concurrency control, snapshot isolation
allows transactions to proceed without worrying about concurrent operations, and
more importantly without needing to re-verify all read operations when the
transaction finally commits. The only information that must be stored during the
transaction is a list of updates made, which can be scanned for conflicts fairly
easily before being committed.
"""

__copyright__ = 'Matt Tierney'
__license__ = 'GPLv3'
__author__ = 'tierney@cs.nyu.edu (Matt Tierney)'

import os
import boto
import logging
import sqlite3
from crypto_util import get_random_uuid
from exception import DomainDisappearedError, VersioningError
from hashlib import sha1
from master_db_connection import MasterDBConnection
from random import randint
from time import time as epoch_time
from time import sleep


_TIMEOUT_SECONDS = 10
_NUM_RETRIES = 3

_DEFAULT_DATABASE_NAME = 'metadata.db'
_DEFAULT_DATABASE_DIRECTORY = os.path.join(os.path.expanduser('~'), '.lockbox')
if not os.path.exists(_DEFAULT_DATABASE_DIRECTORY):
  os.makedirs(_DEFAULT_DATABASE_DIRECTORY)


class MetadataStore(object):
  """This should be instantiated one per active Domain."""
  lock_domain = None
  data_domain = None


  def __init__(self, connection, lock_domain_name, data_domain_name,
               database_directory=_DEFAULT_DATABASE_DIRECTORY,
               database_name=_DEFAULT_DATABASE_NAME):
    """Assume that the connection we receive is one that already works (usually
    called with boto.connect_sdb())."""
    self.connection = connection
    self.lock_domain_name = lock_domain_name
    self.data_domain_name = data_domain_name
    self._connect_domains()
    self.database_directory = database_directory
    self.database_name = database_name
    self.database_path = os.path.join(self.database_directory,
                                      self.database_name)
    self._initialize_metadata()
    self._initialize_signatures()


  def _connect_domains(self):
    self.lock_domain = self._get_domain(self.lock_domain_name)
    self.data_domain = self._get_domain(self.data_domain_name)


  def _initialize_metadata(self):
    logging.info('Initializing metadata table.')
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute(
          'CREATE TABLE metadata('
          'item text, '
          'key text, '
          'value text, '
          'PRIMARY KEY (item, key))')
    except sqlite3.OperationalError, e:
      logging.info('SQLite error (%s).' % e)


  def _initialize_signatures(self):
    logging.info('Initializing signatures table.')
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('CREATE TABLE signatures(hash text, signature text, '
                       'PRIMARY KEY (hash))')
    except sqlite3.OperationalError, e:
      logging.info('SQLite error (%s).' % e)


  def set_signature(self, hash_of_encrypted_blob, signature_of_blob):
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('INSERT OR REPLACE INTO signatures(hash, signature) '
                       'VALUES (?, ?)',
                       (hash_of_encrypted_blob, signature_of_blob))
    except sqlite3.OperationalError, e:
      logging.error('Version insert error: (%s).' % e)


  def lookup_signature(self, hash_of_encrypted_blob):
    try:
      with MasterDBConnection(self.database_path) as cursor:
        result = cursor.execute('SELECT signature FROM signatures '
                                'WHERE hash = ?', (hash_of_encrypted_blob,))
        signature_row = result.fetchone()
        assert signature_row
        signature = signature_row[0]
        logging.info('Retrieved signature for (%s): (%s).' %
                     (hash_of_encrypted_blob, signature))
        return signature
    except sqlite3.OperationalError, e:
      logging.error('Version insert error: (%s).' % e)


  @staticmethod
  def _lock_name(object_path_hash):
    return '%s-lock-%s' % (object_path_hash, get_random_uuid())


  def _select_object_locks_query(self, object_path_hash):
    """Return string query for locks whose names start with the name of the
    object."""
    return "SELECT * FROM %s WHERE `lock_name` LIKE '%s%%'" % \
        (self.lock_domain.name, object_path_hash)


  @staticmethod
  def _find_latest(in_dict):
    """Expects that in_dict is a dict sub-class.
    O(n) algorithm. Precisely: O(2n).

    Returns:
      Name of the latest object.
    """
    logging.debug('Reversing the DAG.')
    reverse_dag = {}
    for key in in_dict:
      reverse_dag[in_dict[key]] = key

    _next = ''
    try:
      while True:
        _next = reverse_dag[_next]
    except KeyError:
      logging.debug('Found the latest key (%s).' % _next)
      return _next


  def _get_domain(self, domain):
    if self.connection.lookup(domain, validate=True):
      logging.info('Returning already-existing domain.')
      return self.connection.get_domain(domain, validate=True)
    logging.info('Creating and returning new domain.')
    return self.connection.create_domain(domain)


  def _save_item(self, item):
    retries_remaining = _NUM_RETRIES
    while retries_remaining > 0:
      try:
        item.save()
        return True
      except boto.exception.SDBResponseError, e:
        if 'InvalidParameterValue' in e:
          logging.error('SDBResponseError: (%s).' % e)
          return False
        else:
          logging.warning('Domain disappeared (temporarily?): '
                          '%d attempts remain.' % retries_remaining)
          sleep(randint(1,4))
          retries_remaining -= 1

    raise DomainDisappearedError()


  def _set_and_save_item_attr(self, item, key, value, retries=_NUM_RETRIES):
    """item should be a boto SimpleDB item."""
    item[key] = value
    return self._save_item(item)


  def _set_local_item_key_value(self, item, key, value):
    logging.info('Setting local metadata (%s, %s, %s).' % (item, key, value))
    try:
      with MasterDBConnection(self.database_path) as cursor:
        cursor.execute('INSERT INTO metadata(item, key, value) '
                       'VALUES (?, ?, ?)', (item, key, value))
      return True
    except Exception, e:
      logging.error('Metadata insert error: %s.' % e)
      return False


  @staticmethod
  def _create_dag_from_list(in_list):
    ret = {}
    for key, value in in_list:
      ret[key] = value
    return ret


  def local_view_of_previous(self, item):
    logging.info('Getting local view of previous.')
    try:
      with MasterDBConnection(self.database_path) as cursor:
        results = cursor.execute('SELECT key, value FROM metadata '
                                 'WHERE item = ?', (item,))
        dag = results.fetchall()
    except Exception, e:
      logging.error('Could not select item because: %s.' % e)
      return False

    if not dag:
      return ''

    dict_dag = self._create_dag_from_list(dag)
    latest = self._find_latest(dict_dag)
    logging.info('For item (%s), latest is (%s).' % (item, latest))
    return latest


  def acquire_lock(self, object_path_hash):
    """Try to get a lock on the object in the domain that manages locks for the
    object.

    Returns:
      (bool success, lock)
      success: Indicates whether we won the bid to write the object.
      lock: boto Lock object we either found for this object or that we created.
    """
    # Get a valid new lock name
    lock_id = self._lock_name(object_path_hash)

    # Check if we already have al ock for the object.
    query = self._select_object_locks_query(object_path_hash)
    matching_locks = self.lock_domain.select(query, consistent_read=True)
    try:
      _ = matching_locks.next()
      # Found a lock for the same object.
      return False, _
    except StopIteration:
      # Did not find any locks.
      logging.info('Success! No matching lock for the object %s.' % object_path_hash)
      pass

    # Set attributes for a new, unconfirmed lock.
    unconfirmed_lock = self.lock_domain.new_item(unicode(lock_id))
    unconfirmed_lock[unicode('lock_name')] = unicode(lock_id)
    unconfirmed_lock[unicode('user')] = unicode('tierney')
    unconfirmed_lock[unicode('epoch_time')] = unicode(epoch_time())
    self._save_item(unconfirmed_lock)

    # Check if another lock was taken at this time. If so, we release our lock.
    query = self._select_object_locks_query(object_path_hash)
    matching_locks = self.lock_domain.select(query, consistent_read=True)
    for _lock in matching_locks:
      # Finding a matching lock verifies that we can read the lock that we wrote.
      if _lock == unconfirmed_lock:
        continue

      # Check if we should ignore the lock due to a timeout.
      if (epoch_time() - float(_lock.epoch_time) > _TIMEOUT_SECONDS):
        logging.info('Encountered (and ignoring) an old lock: %s.' % _lock)
        continue

      # Concede. Delete our lock and return failure.
      logging.info('Found a conflicting lock so we must release.\n' \
                   ' found lock: %s.\n' \
                   ' unconfirmed lock: %s.' %
                   (_lock, unconfirmed_lock))
      # Another lock found. Need to release ours.
      self.lock_domain.delete_item(unconfirmed_lock)
      return False, _lock

    # Return success and the lock (we have confirmed it at this point though).
    return True, unconfirmed_lock


  def release_lock(self, lock):
    """Deletes any given lock (item) in the lock_domain."""
    self.lock_domain.delete_item(lock)


  def set_path(self, object_path_hash, hash_of_encrypted_relative_filepath):
    """Adds a pointer to the hash of the encrypted relative (to a monitored
    directory) filepath to the metadata."""
    item = self.data_domain.get_item(object_path_hash, consistent_read=True)
    if not item:
      item = self.data_domain.new_item(object_path_hash)
    self._set_and_save_item_attr(item, 'path', hash_of_encrypted_relative_filepath)
    self._set_local_item_key_value(
      object_path_hash, 'path', hash_of_encrypted_relative_filepath)


  def set_keys(self, hash_of_exported_keys):
    """hash_of_exported_keys should have a corresponding S3 object."""
    item = self.data_domain.get_item('keyring', consistent_read=True)
    if not item:
      item = self.data_domain.new_item('keyring')
    self._set_and_save_item_attr(item, 'public_key_block', hash_of_exported_keys)
    logging.warning('Do not store exported keys in metadata.')


  def update_object(self, object_path_hash, new_hash, prev_hash=''):
    """Assumes that we have a lock on the object_path_hash."""
    item = self.data_domain.get_item(object_path_hash, consistent_read=True)
    if not item:
      assert prev_hash == ''
      logging.info('Creating new item.')
      item = self.data_domain.new_item(object_path_hash)

    latest_id = self._find_latest(item)
    if latest_id != prev_hash:
      logging.error('Thought this would be the latest (%s) but found this ' \
                      'to be the latest (%s).' % (prev_hash, latest_id))
      raise VersioningError()

    logging.info('Confirmed that we can set the update. '
                 'Will say new (%s) -> prev (%s).' % (new_hash, prev_hash))
    self._set_and_save_item_attr(item, new_hash, prev_hash)
    self._set_local_item_key_value(object_path_hash, new_hash, prev_hash)
    return True
