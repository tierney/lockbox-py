#!/usr/bin/env python
"""SimpleDB methods for the Lockbox project.

Assumed layout of the SimpleDB domains.

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


class AsyncMetadataStore(object):
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


def _sha1_of_string(string):
  assert isinstance(string, str)
  h = sha1()
  h.update(string)
  return h.hexdigest()


def _sha1_hexdigest_of_file_handle(file_handle):
  """
  file_handle: opened file handle. Expect caller to close the file.

  Returns the SHA1 of the file_handle.read().
  """
  assert isinstance(file_handle, file)
  h = sha1()
  h.update(file_handle.read())
  return h.hexdigest()


def _sha1_of_file(filename):
  if not os.path.exists(filename):
    return False

  with open(filename) as fh:
    return _sha1_hexdigest_of_file_handle(fh)


def _lock_name(object_path_hash):
  return '%s-lock-%s' % (object_path_hash, get_random_uuid())


def get_domain(conn, domain_name):
  if conn.lookup(domain_name, validate=True):
    return conn.get_domain(domain_name, validate=True)
  logging.info('Creating the new domain.')
  return conn.create_domain(domain_name)


def _select_object_locks_query(lock_domain, object_path_hash):
  """Return string query for locks whose names start with the name of the
  object."""
  return "select * from %s where `lock_name` like '%s%%'" % \
         (lock_domain, object_path_hash)


def release_domain_object_lock(lock_domain, lock):
  """Deletes the lock for the object."""
  lock_domain.delete_item(lock)


def acquire_domain_object_lock(lock_domain, object_path_hash):
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
  query = _select_object_locks_query(lock_domain.name, object_path_hash)
  matching_locks = lock_domain.select(query, consistent_read=True)
  try:
    _ = matching_locks.next()
    # Found a lock for the same object.
    return False, _
  except StopIteration:
    # Did not find any locks.
    logging.info('Success! No matching lock for the object %s.' % object_path_hash)
    pass

  # Set attributes for a new, unconfirmed lock.
  unconfirmed_lock = lock_domain.new_item(unicode(lock_id))
  unconfirmed_lock[unicode('lock_name')] = unicode(lock_id)
  unconfirmed_lock[unicode('user')] = unicode('tierney')
  unconfirmed_lock[unicode('epoch_time')] = unicode(epoch_time())
  while True:
    try:
      unconfirmed_lock.save()
      break
    except boto.exception.SDBResponseError:
      logging.warning('Domain does not exist.')

  # Check if another lock was taken at this time. If so, we release our lock.
  query = _select_object_locks_query(lock_domain.name, object_path_hash)
  matching_locks = lock_domain.select(query, consistent_read=True)
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
    lock_domain.delete_item(unconfirmed_lock)
    return False, _lock

  # Return success and the lock (we have confirmed it at this point though).
  return True, unconfirmed_lock


def _find_latest(item):
  """Expects that item is a dict sub-class.
  O(n) algorithm. Precisely: O(2n).

  Returns:
    Name of the latest object.
  """
  logging.debug('Reversing the DAG.')
  reverse_dag = {}
  for key in item:
    reverse_dag[item[key]] = key

  _next = ''
  try:
    while True:
      _next = reverse_dag[_next]
  except KeyError:
    logging.debug('Found the latest key (%s).' % _next)
    return _next


def _set_and_save_item_attr(item, key, value):
  retries = 3
  while retries > 0:
    try:
      item[key] = value
      item.save()
      break
    except boto.exception.SDBResponseError:
      logging.warning('Domain disappeared (should be temporary). '
                      '%d attempts remain.' % retries)


def _add_delta(item, latest_id, penultimate_id):
  # TODO(tierney): If changelist is getting too long, then we would want to
  # collapse that here.

  # Find the latest object in the metadata tables.
  prev_id = _find_latest(item)
  if (prev_id != penultimate_id):
    logging.error('Thought this would be the latest (%s) but found this ' \
                  'to be the latest (%s).' % (penultimate_id, prev_id))
    return False

  # Add the object_path_hash and point to the previous object.
  logging.info("Setting latest_id (%s) to penultimate_id (%s)." %
               (latest_id, penultimate_id))
  _set_and_save_item_attr(item, latest_id, penultimate_id)
  return True


def add_path(domain, object_path_hash, filepath):
  """Adds the encrypted filepath to the metadata as the 'path' item."""
  # Should work if the file is modified.
  object_item = domain.get_item(object_path_hash, consistent_read=True)
  # Enter this case if the file is new.
  if not object_item:
    object_item = domain.new_item(object_path_hash)
  _set_and_save_item_attr(object_item, 'path', filepath)


def add_object_delta(domain, object_path_hash, new_id):
  object_item = domain.get_item(object_path_hash, consistent_read=True)
  if not object_item:
    object_item = domain.new_item(object_path_hash)

  penultimate = _find_latest(object_item)
  while True:
    try:
      status = _add_delta(object_item, new_id, penultimate)
      break
    except boto.exception.SDBResponseError:
      logging.warning('Domain disappeared temporarily.')
  return status


def _select_all(domain):
  return domain.select('select * from %s' % domain.name, consistent_read=True)


def _print_lock_domain(domain, object_path_hash):
  output = ''
  select_result = domain.select(
    "select * from %s where lock_name like '%s%%'" %
    (domain.name, object_path_hash), consistent_read=True)
  for entry in select_result:
    output += '%s\n' % (entry.name)
    for key in entry:
      output += ' %s %s\n' % (key, entry[key])
  logging.info(output)


def _print_all_domain(domain):
  output = 'Domain Print Output:\n'
  for item in _select_all(domain):
    output += 'Item Name: (%s)\n' % (item.name)
    for attr in item:
      # We use len 40 for the SHA1 hash outputs.
      output += '  attr key (%40s) --> value (%40s)\n' % (attr, item[attr])
  logging.info(output)


def main():
  """
  item: a super-object name in S3 (looks like UUID).
  key:  SHA1 of the GPG file contents.
  prev: value of the key that precedes this key's meaning.
    (prev == NULL) ==> key represents a file checkpoint.
  """
  try:
    conn = boto.connect_sdb() # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  except boto.exception.NoAuthHandlerFound, e:
    logging.error(e)
    return

  domain_name_group = 'group1'
  domain_name_group_locks = 'group1_locks'

  domain_group = get_domain(conn, domain_name_group)
  domain_group_locks = get_domain(conn, domain_name_group_locks)

  object_path_hash = get_random_uuid()

  success, lock = acquire_domain_object_lock(domain_group_locks, object_path_hash)
  if not success:
    logging.warning('Did not acquire the log we wanted.')
  add_object_delta(domain_group, object_path_hash, get_random_uuid())
  release_domain_object_lock(domain_group_locks, lock)

  success, lock = acquire_domain_object_lock(domain_group_locks, object_path_hash)
  if not success:
    logging.warning('Did not acquire the lock we wanted. Check for update.')
  add_object_delta(domain_group, object_path_hash, get_random_uuid())
  release_domain_object_lock(domain_group_locks, lock)

  success, lock = acquire_domain_object_lock(domain_group_locks, object_path_hash)
  _print_lock_domain(domain_group_locks, object_path_hash)
  add_object_delta(domain_group, object_path_hash, get_random_uuid())
  release_domain_object_lock(domain_group_locks, lock)

  logging.info('select everything from lock domain. (should be empty.)')
  _print_lock_domain(domain_group_locks, object_path_hash)

  logging.info('select everything from domain.')
  _print_all_domain(domain_group)

  logging.info('Cleaning up.')
  conn.delete_domain(domain_name_group)
  conn.delete_domain(domain_name_group_locks)
  logging.info('Usage: %f.' % conn.get_usage())


if __name__ == '__main__':
  main()
