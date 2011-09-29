#!/usr/bin/env python

from boto import connect_s3, connect_sdb, connect_sns, connect_sqs
from lockbox import rsync
from lockbox.gnupg import GPG
from lockbox.event_handler import LockboxEventHandler
import unittest


class LockboxTestCase(unittest.TestCase):
  def setUp(self):
    self.s3_connection = connect_s3()
    self.sdb_connection = connect_sdb()
    self.sns_connection = connect_sns()
    self.sqs_connection = connect_sqs()
    self.gpg = GPG()
    self.event_handler = LockboxEventHandler()


  def tearDown(self):
    pass


  def test_placeholder(self):
    self.assertTrue(True)


if __name__ == '__main__':
  unittest.main()
