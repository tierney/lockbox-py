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

from exception import DomainDisappearedError
import os
import boto
import logging
from uuid import uuid4
from time import time as epoch_time
from hashlib import sha1

_TIMEOUT_SECONDS = 10
_NUM_RETRIES = 3

logging.basicConfig()
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class MetadataStore(object):
  """This should be instantiated one per active Domain."""
  lock_domain = None
  data_domain = None


  def __init__(self, connection, lock_domain_name, data_domain_name):
    """Assume that the connection we receive is one that already works (usually
    called with boto.connect_sdb())."""
    self.connection = connection
    self.lock_domain_name = lock_domain_name
    self.data_domain_name = data_domain_name
    self._connect_domains()


  def _get_domain(self, domain):
    if self.connection.lookup(domain, validate=True):
      logging.info('Returning already-existing domain.')
      return self.connection.get_domain(domain, validate=True)
    logging.info('Creating and returning new domain.')
    return self.connection.create_domain(domain)


  def _connect_domains(self):
    self.lock_domain = self._get_domain(self.lock_domain_name)
    self.data_domain = self._get_domain(self.data_domain_name)


  def _save_item(self, item):
    retries_remaining = _NUM_RETRIES
    while retries_remaining > 0:
      try:
        item.save()
        return True
      except boto.exception.SDBResponseError:
        logging.warning('Domain disappeared (temporarily?): '
                        '%d attempts remain.' % retries_remaining)
    raise DomainDisappeared()


  def _set_and_save_item_attr(self, item, key, value, retries=_NUM_RETRIES):
    """item should be a boto SimpleDB item."""
    item[key] = value
    return self._save_item(item)


  def acquire_lock(self, object_path_hash):
    """Try to get a lock on the object in the domain that manages locks for the
    object.

    Returns:
      (bool success, lock)
      success: Indicates whether we won the bid to write the object.
      lock: boto Lock object we either found for this object or that we created.
    """
    # Get a valid new lock name
    lock_id = _lock_name(object_path_hash)

    # Check if we already have a lock for the object.
    query = _select_object_locks_query(self.lock_domain.name, object_path_hash)
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
    query = _select_object_locks_query(self.lock_domain.name, object_path_hash)
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


  def set_keys(self, hash_of_exported_keys):
    """hash_of_exported_keys should have a corresponding S3 object."""
    item = self.data_domain.get_item('keyring', consistent_read=True)
    if not item:
      item = self.data_domain.new_item('keyring')
    self._set_and_save_item_attr(item, 'public_key_block', hash_of_exported_keys)


  def update_object(self, object_path_hash, new_hash, prev_hash=''):
    """Assumes that we have a lock on the object_path_hash."""
    item = self.data_domain.get_item(object_path_hash, consistent_read=True)
    if not item:
      assert prev_hash == ''
      logging.info('Creating new item.')
      item = self.data_domain.new_item(object_path_hash)

    latest_id = _find_latest(item)
    if latest_id != prev_hash:
      logging.error('Thought this would be the latest (%s) but found this ' \
                      'to be the latest (%s).' % (prev_hash, latest_id))
      raise VersioningConflict()

    logging.info('Confirmed that we can set the update. '
                 'Will say new (%s) -> prev (%s).' % (new_hash, prev_hash))
    self._set_and_save_item_attr(item, new_hash, prev_hash)
    return True
