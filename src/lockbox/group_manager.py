#!/usr/bin/env python

import gnupg
import logging

logging.basicConfig() # level=logging.DEBUG)

class GroupManager(object):
  """Manages local knowledge of group membership."""
  def __init__(self):
    pass


def _is_sequence(instance):
    return isinstance(instance,list) or isinstance(instance,tuple)


class Group(object):
  def __init__(self, gpg, service_name_prefix):
    """
    Attributes:
      service_name_prefix: group0_data domain => group0
    """
    self.gpg = gpg
    self.service_names_prefix = service_name_prefix
    self.member_uid_to_keyid = {}
    self.public_key_block = None
    self.permissions = None


  def _get_already_imported_keys(self):
    return self.gpg.uid_to_keyid()


  def _get_similar_already_imported_keys(self, name):
    uid_to_fp = self._get_already_imported_keys()
    logging.debug(str(uid_to_fp))
    candidate_keys = [(uid, uid_to_fp.get(uid)) for uid in uid_to_fp
                      if name.lower() in uid.lower()]
    return candidate_keys


  def _group_keyids(self):
    return self.member_uid_to_keyid.values()


  def add_members(self, members):
    if not _is_sequence(members):
      return add_member(members)

    uid_to_keyids = self._get_already_imported_keys()
    lowered_uids = [uid.lower() for uid in uid_to_keyids.keys()]
    matching_uid_to_keyids = [(uid, uid_to_keyids.get(uid))
                              for uid in uid_to_keyids
                              if uid.lower() in lowered_uids]
    if len(matching_uid_to_keyids) < len(members):
      logging.warning('Not all members matched (%s) found vs. (%s) given.' %
                      ([match[0] for match in matching_uid_to_keyids], members))
    for match in matching_uid_to_keyids:
      self.member_uid_to_keyid[match[0]] = match[1]


  def add_member(self, member):
    """Verifies that the member key exists and that sets the local cache version
    to the KeyID."""
    candidates = self._get_similar_already_imported_keys(member)
    if not candidates:
      return False

    if len(candidates) > 1:
      logging.warning('We do not account for multiple matching names yet. '
                      'Taking first match.')
    uid = candidates[0][0]
    keyid = candidates[0][1]
    self.member_uid_to_keyid[uid] = keyid


  def set_public_key_block(self):
    keyids = self._group_keyids()
    self.public_key_block = self.gpg.export_keys(keyids)


def main():
  gpg = gnupg.GPG()
  group = Group(gpg, 'group0')
  members = ['matt tierney', 'george washington', 'john adams', 'bristol palin']
  group.add_members(members)
  # for member in members:
  #   group.add_member(member)
  print group.member_uid_to_keyid
  group.set_public_key_block()
  print group.public_key_block

if __name__=='__main__':
  main()
