#!/usr/bin/env python

from boto import connect_sdb
import logging
import gnupg
import os
import tempfile
from hashlib import sha1
from simpledb import _sha1_of_file, add_path, get_domain, _print_all_domain, \
    acquire_domain_object_lock, add_object, release_domain_object_lock

logging.basicConfig()
# logger = logging.getLogger()
# logger.setLevel(logging.DEBUG)

def detected_new_file(new_file_fp, recipients):
  gpg = gnupg.GPG()
  enc_file_name = ''
  # Write out temporary GPG file to temp directory.
  with tempfile.NamedTemporaryFile(delete=False) as enc_tmp_file:
    edata = gpg.encrypt_file(new_file_fp,
                             recipients,
                             always_trust=True,
                             armor=True,
                             output=enc_tmp_file.name)
    enc_file_name = enc_tmp_file.name

  # Get the SHA1 of the file.
  file_sha1 = _sha1_of_file(enc_file_name)

  # Filepath
  filepath = '/this/is/my/file.path'
  h = sha1()
  h.update(filepath)
  sha_filepath = h.hexdigest()
  enc_filepath = gpg.encrypt(filepath,
                             recipients,
                             always_trust=True,
                             armor=True)
  logging.debug('Original filepath: %s. Encrypted filepath: %s. '
                'SHA-ed filepath: %s' %
                (filepath, enc_filepath.data, sha_filepath))

  sdb_conn = connect_sdb()
  data_domain = get_domain(sdb_conn, 'group1')
  lock_domain = get_domain(sdb_conn, 'group1_locks')

  success, lock = acquire_domain_object_lock(lock_domain, sha_filepath)
  if not success:
    logging.error("Houston, we didn't get a lock.")
  try:
    add_path(data_domain, sha_filepath, enc_filepath)
  except Exception, e:
    print "We a problem:", e
    logging.error(e)
  add_object(data_domain, sha_filepath, file_sha1)
  release_domain_object_lock(lock_domain, lock)

  _print_all_domain(data_domain)

  sdb_conn.delete_domain('group1')
  sdb_conn.delete_domain('group1_locks')

  return enc_file_name

if __name__ == '__main__':
  with tempfile.NamedTemporaryFile(delete=False) as tmp:
    tmp.write("hello world")
    tmp.seek(0)
    # name = detected_new_file(tmp, ["\'Matt Tierney\'"])
    name = detected_new_file(tmp, ["\'Matt Tierney\'"])
  print "Done."
  with open(name) as fh:
    print "".join(fh.readlines())
