#!/usr/bin/env python

import gnupg

class GroupManager(object):
  """Manages local knowledge of group membership."""
  def __init__(self):
    pass

class Group(object):
  def __init__(self, gpg, owner, service_name_prefix):
    self.gpg = gpg
    self.owner = owner
    self.service_names_prefix = service_name_prefix
    self.members = [owner]
    self.public_key_block = None
    self.permissions = None


  def __verify_username_key_already_imported(self, name):
    pass


  def add_member(self, member):
    self.members.append(member)


def main():
  gpg = gnupg.GPG()
  uid_to_fp = gpg.uid_to_fingerprint()
  for uid in uid_to_fp:
    print uid, uid_to_fp[uid]

if __name__=='__main__':
  main()
