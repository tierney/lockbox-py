#!/usr/bin/env python
"""SimpleDB methods for the Lockbox project."""

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
    domain = conn.get_domain(domain_name)
  except boto.exception.SDBResponseError:
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
  """
  Returns:
    (bool success, lock)
    success: Indicates whether we won the bid to write the object.
    lock: Data about the lock we either found for this object or that we crated.
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
    pass
  except boto.exception.SDBResponseError:
    logging.info('Not quite what we were hoping for.')
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



def main():
  """
  item: a super-object name in S3 (looks like UUID).
  key:  SHA1 of the GPG file contents.
  prev: value of the key that precedes this key's meaning.
    (prev == NULL) ==> key represents a file checkpoint.
  """

  conn = boto.connect_sdb() # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)

  domain_name_group = 'group0'
  domain_name_group_locks = 'group0_locks'

  domain_group = get_domain(conn, domain_name_group)
  domain_group_locks = get_domain(conn, domain_name_group_locks)

  data = {}
  locks = {}

  object_id = _get_random_uuid()

  success, lock = acquire_domain_object_lock(domain_group_locks, object_id)
  if not success:
    print 'We had a problem.'
    print lock
    return
  
  object_name_0 = '%s-0' % object_id
  object_name_1 = '%s-1' % object_id
  data[object_name_0] = { 'sha1_0' : '',
                          'sha1_1' : 'sha1_0',
                          'sha1_2' : 'sha1_1' }
  data[object_name_1] = { 'sha1_0' : '',
                          'sha1_1' : 'sha1_0',
                          'sha1_2' : 'sha1_1' }


  domain_insert(domain_group, data)

  print domain_group.get_item(object_name_0)
  for entry in domain_group_locks.select("select * from %s where `lock_name` like '%s%%'" %
                                         (domain_name_group_locks, object_id),
                                         consistent_read=True):
    print 'Lock entry:', entry

  print 'Cleaning up.'
  conn.delete_domain(domain_name_group)
  conn.delete_domain(domain_name_group_locks)
  print conn.get_usage()
  print 'Done.'


if __name__ == '__main__':
  main()
