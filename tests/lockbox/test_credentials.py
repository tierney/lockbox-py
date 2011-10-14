#!/usr/bin/env python

import os
import unittest
from lockbox.credentials import Credentials

class CredentialsTestCase(unittest.TestCase):
  def setUp(self):
    self.credentials = Credentials()

    # Local test variables.
    self.my_group_name = 'my_group_name'
    self.my_region = 'my_region'
    self.my_namespace = 'my_namespace'
    self.my_aws_access_key_id = 'my_aws_access_key_id'
    self.my_aws_secret_access_key = 'my_aws_secret_access_key'
    self.my_permissions = 'my_permissions'


  def tearDown(self):
    pass


  def test_set_get_delete(self):
    # Set the credentials row.
    self.credentials.set(self.my_group_name, self.my_region, self.my_namespace,
                         self.my_aws_access_key_id,
                         self.my_aws_secret_access_key, self.my_permissions)

    # Retrieve and parse the credentials for the group.
    response = self.get(self.my_group_name)
    self.assert_(response)
    group = response[0]
    region = response[1]
    namespace = response[2]
    aws_access_key_id = response[3]
    aws_secret_access_key = response[4]
    permissions = response[5]

    # Test the values of the response.
    self.assertEqual(group, self.my_group_name)
    self.assertEqual(region, self.my_region)

    # Delete the row.
    _ = self.credentials.delete(self.my_group_name)
    self.assertTrue(_)
