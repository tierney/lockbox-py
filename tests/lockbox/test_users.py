#!/usr/bin/env python

import boto
import lockbox.gnupg as gnupg
import unittest
from lockbox.users import Users
from lockbox.crypto_util import get_random_uuid

class UsersTestCase(unittest.TestCase):
  def setUp(self):
    self.iam_connection = boto.connect_iam()
    self.gpg = gnupg.GPG()
    self.users = Users(self.iam_connection, self.gpg)
    self.random_user_name = get_random_uuid()
    
  def tearDown(self):
    self.users.delete_user(self.random_user_name)

  def test_create_user(self):
    self.assertTrue(self.users.create_user(self.random_user_name))
    self.assertTrue(self.users.delete_user(self.random_user_name))
