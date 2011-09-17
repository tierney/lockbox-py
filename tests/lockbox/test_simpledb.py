#!/usr/bin/env python

__author__ = 'tierney@cs.nyu.edu (Matt Tierney)'

import boto
import unittest
from lockbox.simpledb import get_domain, acquire_domain_object_lock, \
    add_object, release_domain_object_lock, _get_random_uuid

class SimpleDBTestCase(unittest.TestCase):
  def setUp(self):
    pass

  def tearDown(self):
    pass

  def test_simpledb(self):
    try:
      conn = boto.connect_sdb() # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    except boto.exception.NoAuthHandlerFound, e:
      logging.error(e)
      return

    domain_name_group = 'group2'
    domain_name_group_locks = 'group2_locks'

    # Remove any existing domains.
    try: conn.delete_domain(domain_name_group)
    except boto.exception.SDBResponseError: pass

    try: conn.delete_domain(domain_name_group_locks)
    except boto.exception.SDBResponseError: pass

    # Get the domains.
    domain_group = get_domain(conn, domain_name_group)
    domain_group_locks = get_domain(conn, domain_name_group_locks)

    object_id = _get_random_uuid()
    success, lock = acquire_domain_object_lock(domain_group_locks, object_id)
    select_result = domain_group_locks.select(
      "select * from %s where lock_name like '%s%%'" %
      (domain_group_locks.name, object_id), consistent_read=True)
    retrieved_lock = select_result.next()
    assert lock['lock_name'] == retrieved_lock['lock_name']
    assert lock['user'] == retrieved_lock['user']
    assert lock['epoch_time'] == retrieved_lock['epoch_time']

    if not success:
      logging.error('Did not acquire the log we wanted.')

    new_id = _get_random_uuid()
    add_object(domain_group, object_id, new_id)
    select_result = domain_group.select(
      'select * from %s' % (domain_group.name), consistent_read=True)
    retrieved_log = select_result.next()
    print retrieved_log
    print object_id
    print new_id
    assert "" == retrieved_log[unicode(new_id)]

    release_domain_object_lock(domain_group_locks, lock)

    # Cleaning up.
    conn.delete_domain(domain_name_group)
    conn.delete_domain(domain_name_group_locks)


if __name__ == '__main__':
  unittest.main()
