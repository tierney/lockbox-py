#!/usr/bin/env python
"""SimpleDB methods for the Lockbox project.

TODO(tierney): Should address 503 service unavailable errors that we may get
from boto SimpleDB.
"""

__copyright__ = 'Matt Tierney'
__license__ = 'GPLv3'
__author__ = 'tierney@cs.nyu.edu (Matt Tierney)'

import os
import boto
import logging
from uuid import uuid4
from time import time as epoch_time
from hashlib import sha1

logging.basicConfig()
logger = logging.getLogger()
logger.setLevel(logging.INFO)

_TIMEOUT_SECONDS = 10

def _get_random_uuid():
  return uuid4()


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


def _lock_name(object_id):
  return '%s-lock-%s' % (object_id, _get_random_uuid())


def get_domain(conn, domain_name):
  try:
    domain = conn.get_domain(domain_name, validate=True)
  except boto.exception.SDBResponseError:
    logging.info('Did not get domain. Creating one instead.')
    domain = conn.create_domain(domain_name)
  return domain


def domain_insert(domain, data):
  # Insert the items
  for name,d in data.items():
    print "Creating new item:", name
    item = domain.new_item(name)
    for k,v in d.items():
      print " adding new attribute: ", k, v
      item[k] = v
    print "saving."
    item.save()


def _select_object_locks_query(lock_domain, object_id):
  """
  Return string query for locks whose names start with the name of the object.
  """
  return "select * from %s where `lock_name` like '%s%%'" % \
         (lock_domain, object_id)

def release_domain_object_lock(lock_domain, lock):
  """Deletes the lock for the object."""
  lock_domain.delete_item(lock)


def acquire_domain_object_lock(lock_domain, object_id):
  """Try to get a lock on the object in the domain that manages locks for the
  object.

  Returns:
    (bool success, lock)
    success: Indicates whether we won the bid to write the object.
    lock: boto Lock object we either found for this object or that we created.
  """
  logging.debug("testing")
  # Get a valid new lock name
  lock_id = _lock_name(object_id)

  # Check if we already have a lock for the object.
  query = _select_object_locks_query(lock_domain.name, object_id)
  matching_locks = lock_domain.select(query, consistent_read=True)
  try:
    _ = matching_locks.next()
    # Found a lock for the same object.
    return False, _
  except StopIteration:
    # Did not find any locks.
    logging.info('Success! No matching lock for the object %s.' % object_id)
    pass

  # Set attributes for a new, unconfirmed lock.
  unconfirmed_lock = lock_domain.new_item(unicode(lock_id))
  unconfirmed_lock[unicode('lock_name')] = unicode(lock_id)
  unconfirmed_lock[unicode('user')] = unicode('tierney')
  unconfirmed_lock[unicode('epoch_time')] = unicode(epoch_time())
  unconfirmed_lock.save()

  # Check if another lock was taken at this time. If so, we release our lock.
  query = _select_object_locks_query(lock_domain.name, object_id)
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
  _find_latest_given_backpointer_dict(item)


def _find_latest_given_backpointer_dict(item):
  """Expects that item is a dict sub-class.
  O(n) algorithm. Precisely: O(2n).

  Returns:
    Name of the latest object.
  """
  logging.info('Reversing the DAG.')
  reverse_dag = {}
  for key in item:
    reverse_dag[item[key]] = key

  _next = ''
  try:
    while True:
      _next = reverse_dag[_next]
  except KeyError:
    logging.info('Found the latest key (%s).' % _next)
    return _next


def add_delta(item, latest_id, penultimate_id):
  # TODO(tierney): If changelist is getting too long, then we would want to
  # collapse that here.

  # Find the latest object in the metadata tables.
  prev_id = _find_latest(item)
  if prev_id != penultimate_id:
    logging.error('Thought this would be the latest (%s) but found this ' \
                  'to be the latest (%s).' % (penultimate_id, prev_id))
    return False
  
  # Add the object_id and point to the previous object.
  item[latest_id] = penultimate_id
  item.save()
  return True


def add_object(domain, object_id, update_id):
  object_item = domain.get_item(object_id, consistent_read=True)
  if not object_item:
    object_item = domain.new_item(object_id)

  latest = _find_latest(object_item)
  if not add_delta(object_item, update_id, latest):
    logging.error('Delta problem.')
  object_item.save()

def _print_lock_domain(domain, object_id):
  select_result = domain.select("select * from %s where lock_name like '%s%%'" %
                                (domain.name, object_id), consistent_read=True)
  for entry in select_result:
    print entry.name
    for key in entry:
      print ' ', key, entry[key]

  
def _print_all_domain(domain):
  for entry in domain.select('select * from %s' %
                             domain.name, consistent_read=True):
    print entry.name
    for key in entry:
      print ' ', key, entry[key]


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

  domain_name_group = 'group0'
  domain_name_group_locks = 'group0_locks'

  domain_group = get_domain(conn, domain_name_group)
  domain_group_locks = get_domain(conn, domain_name_group_locks)

  data = {}
  locks = {}

  object_id = _get_random_uuid()

  success, lock = acquire_domain_object_lock(domain_group_locks, object_id)
  if not success:
    logging.error('Did not acquire the log we wanted.')
  add_object(domain_group, object_id, _get_random_uuid())
  release_domain_object_lock(domain_group_locks, lock)

  success, lock = acquire_domain_object_lock(domain_group_locks, object_id)
  if not success:
    logging.error('Did not acquire the lock we wanted. Check for update.')
  add_object(domain_group, object_id, _get_random_uuid())
  release_domain_object_lock(domain_group_locks, lock)

  success, lock = acquire_domain_object_lock(domain_group_locks, object_id)
  _print_lock_domain(domain_group_locks, object_id)
  add_object(domain_group, object_id, _get_random_uuid())
  release_domain_object_lock(domain_group_locks, lock)

  print 'select everything from lock domain.'
  _print_lock_domain(domain_group_locks, object_id)
  
  print 'select everything from domain.'
  _print_all_domain(domain_group)
  
  print 'Cleaning up.'
  conn.delete_domain(domain_name_group)
  conn.delete_domain(domain_name_group_locks)
  print conn.get_usage()
  print 'Done.'


if __name__ == '__main__':
  main()
