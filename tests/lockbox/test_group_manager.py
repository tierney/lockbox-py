#!/usr/bin/env python

import time
import unittest
from boto import connect_sns, connect_sqs
from lockbox.group_manager import GroupManager


class GroupManagerTestCase(unittest.TestCase):
  def setUp(self):
    self.sns_connection = connect_sns()
    self.sqs_connection = connect_sqs()


  def tearDown(self):
    pass


  def test_group_manager(self):
    gm = GroupManager(self.sns_connection, self.sqs_connection)
    self.assertTrue(gm.create_group('test_group_manager'))
    self.assertTrue(gm.delete_group('test_group_manager'))


  def test_pass_bad_connections(self):
    self.assertRaises(AssertionError, GroupManager, None, None)


  def test_join_group(self):
    pass

if __name__ == '__main__':
  unittest.main()
