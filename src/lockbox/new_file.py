#!/usr/bin/env python

from boto import connect_sdb
import logging
import gnupg
import os
import re
import tempfile
import gflags
from hashlib import sha1
from simpledb import _sha1_of_file, add_path, get_domain, _print_all_domain, \
    acquire_domain_object_lock, add_object_delta, \
    release_domain_object_lock, _sha1_of_string

FLAGS = gflags.FLAGS
gflags.DEFINE_multistring('basepath', '/tmp/lockbox/', 'Base filepath(s) for Lockbox.')

FORMAT = "%(asctime)-15s %(level)s %(module)-8s %(message)s"
logging.basicConfig(format=FORMAT)
# logger = logging.getLogger()
# logger.setLevel(logging.DEBUG)


def detected_new_file(new_file_fp, recipients):
  logging.debug('Entered detected_new_file.')
  gpg = gnupg.GPG()
  enc_file_name = ''
  # Write out temporary GPG file to temp directory.
  with tempfile.NamedTemporaryFile(delete=False, prefix='lockbox/lockbox') \
        as enc_tmp_file:
    edata = gpg.encrypt_file(new_file_fp,
                             recipients,
                             always_trust=True,
                             armor=True,
                             output=enc_tmp_file.name)
    enc_file_name = enc_tmp_file.name
  logging.debug('Finished encrypting the original file.')

  # Get the SHA1 of the file.
  file_sha1 = _sha1_of_file(enc_file_name)

  # Filepath
  filepath = new_file_fp.name # '/home/username/Lockbox/this/is/my/file.path'
  oldfilepath = new_file_fp.name
  for basepath in FLAGS.basepath:
    if filepath.startswith(basepath):
      filepath = re.sub(basepath, '', filepath)
  if oldfilepath == filepath:
    logging.error('Basepath not found for %s.' % filepath)
  else:
    logging.debug('Detected basepath: %s.' % basepath)
    logging.debug('Shortened filepath: %s.' % filepath)

  # Take SHA1 of path relative to the basepath.
  sha_filepath = _sha1_of_string(filepath)

  # Encrypt the exact value of the basepath.
  enc_filepath = gpg.encrypt(filepath,
                             recipients,
                             always_trust=True,
                             armor=True)
  sha_enc_fp = _sha1_of_string(enc_filepath.data)
  logging.info("Upload to S3: SHA1(enc_filepath): '%s' data: '%s'" % \
                 (sha_enc_fp, enc_filepath.data))
  # logging.debug('Original filepath: %s. Encrypted filepath: %s. '
  #               'SHA-ed filepath: %s' %
  #               (filepath, enc_filepath.data, sha_filepath))

  # Scaffolding for testing.
  sdb_conn = connect_sdb()
  data_domain = get_domain(sdb_conn, 'group1')
  lock_domain = get_domain(sdb_conn, 'group1_locks')
  success, lock = acquire_domain_object_lock(lock_domain, sha_filepath)
  if not success:
    logging.error("Houston, we didn't get a lock for the object.")

  # Meat and potatoes.
  add_path(data_domain, sha_filepath, sha_enc_fp) # enc_filepath)
  add_object_delta(data_domain, sha_filepath, file_sha1)

  # Scaffolding for testing.
  release_domain_object_lock(lock_domain, lock)
  _print_all_domain(data_domain)
  sdb_conn.delete_domain('group1')
  sdb_conn.delete_domain('group1_locks')

  return enc_file_name

if __name__ == '__main__':
  if os.path.exists('/tmp/lockbox'):
    os.system('rm /tmp/lockbox/*')
    os.rmdir('/tmp/lockbox')
  os.mkdir('/tmp/lockbox')

  logging.debug('Creating file.')
  with tempfile.NamedTemporaryFile(delete=False, prefix='lockbox/lockbox') as tmp:
    # tmp.write('hello world ' * 100000000)
    tmp.write('hello world ' * 100000)
    tmp.seek(0)
    name = detected_new_file(tmp, ["\'Matt Tierney\'"])
    os.remove(tmp.name)
  print "Done."

  print 'Here is the file returned from detected_new_file:'
  with open(name) as fh:
    data = "".join(fh.readlines())

  print 'Upload to S3: SHA1(PGP(file)): \'%s\' data: %s' % \
      (_sha1_of_file(name), data[:1000])

  os.remove(name)
  os.rmdir('/tmp/lockbox')
