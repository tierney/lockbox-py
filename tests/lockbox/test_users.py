#!/usr/bin/env python

import boto
import lockbox.gnupg as gnupg
import unittest
from lockbox.users import Users

class UsersTestCase(unittest.TestCase):
  def setUp(self):
    self.iam_connection = boto.connect_iam()
    self.gpg = gnupg.GPG()
    self.users = Users(self.iam_connection, self.gpg)

  def tearDown(self):
    pass

  def test_create_user(self):
    self.assertTrue(self.users.create_user('Matt Tierney'))
    self.assertTrue(self.users.delete_user('Matt Tierney'))
    # self.assertTrue(False)
