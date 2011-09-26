#!/usr/bin/env python

import gnupg
import logging

# logging.basicConfig(level=logging.DEBUG)

class GroupManager(object):
  """Manages local knowledge of group membership."""
  def __init__(self):
    pass


class Group(object):
  def __init__(self, gpg, owner, service_name_prefix):
    """
    Attributes:
      service_name_prefix: group0_data domain => group0
    """
    self.gpg = gpg
    self.owner = owner
    self.service_names_prefix = service_name_prefix
    self.members = [owner]
    self.public_key_block = None
    self.permissions = None


  def _get_similar_already_imported_keys(self, name):
    uid_to_fp = self.gpg.uid_to_fingerprint()
    logging.debug(str(uid_to_fp))
    candidate_keys = [uid_to_fp.get(uid) for uid in uid_to_fp
                      if name.lower() in uid.lower()]
    return candidate_keys


  def add_member(self, member):
    candidates = self._get_similar_already_imported_keys(member)
    if not candidates:
      return False

    if len(candidates) > 1:
      logging.warning('We do not account for multiple matching names yet. '
                      'Taking first match.')
    fingerprint = candidates[0]
    print member, fingerprint
    # self.members.append(member)


def main():
  gpg = gnupg.GPG()
  group = Group(gpg, 'iamtheowner', 'group0')
  group.add_member('matt tierney')

if __name__=='__main__':
  main()
