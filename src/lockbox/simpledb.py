#!/usr/bin/env python

import boto
import os
from uuid import uuid4
from time import time as epoch_time
from hashlib import sha1

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
  return "select * from %s where `name` like '%s%%'" % \
         (lock_domain, object_id)


def lock_domain_object(lock_domain, object_id):
  """
  Returns:
    (bool success, lock)
    success: Indicates whether we won the bid to write the object.
    lock: Data about the lock we either found for this object or that we crated.
  """
  # Get a valid new lock name
  lock_id = _lock_name(object_id)
  _ = lock_domain.get_item(lock_id, consistent_read=True)
  if _:
    # Found a lock of the exact same name. Since a lock already exists for this
    # object on the cloud, we are going to wait to try again.
    return False, _lock

  query = _select_object_locks_query(domain_name_group_locks, object_id)
  matching_locks = domain_group_locks.select(query, consistent_read=True)
  try:
    _ = matching_locks.next()
    # Found a lock for the same object.
    return False, _
  except StopIteration:
    # Did not find any locks.
    pass

  unconfirmed_lock = lock_domain.new_item(lock_id)
  unconfirmed_lock['name'] = lock_id
  unconfirmed_lock['user'] = 'tierney'
  unconfirmed_lock['epoch_time'] = epoch_time()


def main():
  """
  item: a super-object name in S3 (looks like UUID).
  key:  SHA1 of the GPG file contents.
  prev: value of the key that precedes this key's meaning.
    (prev == NULL) ==> key represents a file checkpoint.
  """

  conn = boto.connect_sdb(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)

  domain_name_group = 'group0'
  domain_name_group_locks = 'group0_locks'

  domain_group = get_domain(conn, domain_name_group)
  domain_group_locks = get_domain(conn, domain_name_group_locks)

  data = {}
  locks = {}

  object_id = _get_random_uuid()

  lock_name = _lock_name(object_id)
  locks[lock_name] = { 'name': lock_name,
                       'user' : 'myusername',
                       'epoch_time' : epoch_time() }
  lock_name = _lock_name(object_id)
  locks[lock_name] = { 'name': lock_name,
                       'user' : 'myusername',
                       'epoch_time' : epoch_time() }

  object_name_0 = '%s-0' % object_id
  object_name_1 = '%s-1' % object_id
  data[object_name_0] = { 'sha1_0' : '',
                          'sha1_1' : 'sha1_0',
                          'sha1_2' : 'sha1_1' }
  data[object_name_1] = { 'sha1_0' : '',
                          'sha1_1' : 'sha1_0',
                          'sha1_2' : 'sha1_1' }


  domain_insert(domain_group, data)
  domain_insert(domain_group_locks, locks)

  print domain_group.get_item(object_name_0)
  for entry in domain_group_locks.select("select * from %s where `name` like '%s%%'" %
                                         (domain_name_group_locks, object_id),
                                         consistent_read=True):
    print "Lock entry:", entry

  print "Cleaning up."
  conn.delete_domain(domain_name_group)
  conn.delete_domain(domain_name_group_locks)
  print conn.get_usage()
  print 'Done.'


if __name__ == '__main__':
  main()
