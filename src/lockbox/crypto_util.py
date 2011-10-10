#!/usr/bin/env python

import logging
import os
from hashlib import sha1
from uuid import uuid4

def get_random_uuid():
  return unicode(uuid4().hex)


def hash_string(string):
  try:
    assert isinstance(string, str) or isinstance(string, unicode)
  except AssertionError:
    logging.fatal('hash_string input (%s) and type (%s).'
                  % (string, type(string)))
    raise

  h = sha1()
  h.update(string)
  return h.hexdigest()


def hash_file(file_handle):
  """Hashes an opened file handle.

  Args:
    file_handle: An open file (callable seek(), read(), etc. methods).

  Returns:
    SHA1 of string.
  """
  assert isinstance(file_handle, file)
  return hash_string(file_handle.read())


def hash_filename(filename):
  if not os.path.exists(filename):
    return False

  with open(filename) as fh:
    return hash_file(fh)


def lock_name(object_hash):
  return '%s-lock-%s' % (object_hash, get_random_uuid())
