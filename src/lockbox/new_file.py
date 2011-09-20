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
gflags.DEFINE_string('lock_domain', 'group0_lock', 'Lock domain for a group.')
gflags.DEFINE_string('data_domain', 'group0_data', 'Data domain for a group.')

FORMAT = "%(asctime)-15s %(level)s %(module)-8s %(message)s"
logging.basicConfig(format=FORMAT)
# logger = logging.getLogger()
# logger.setLevel(logging.DEBUG)


class LockboxFileUpdater(object):
  def __init__(self, blob_store, metadata_store, hash_enc_blob,
               enc_file_path_string, enc_blob_path, hash_enc_file_path,
               hash_prev_blob=''):
    """Sets up the basic components for performing updates."""
    # Stores.
    self.blob_store = blob_store
    self.metadata_store = metadata_store

    # SDB: 'path' -> hash_enc_file_path.
    self.hash_enc_file_path = hash_enc_file_path

    # S3: hash_enc_file_path -> enc_file_path_string.
    self.enc_file_path_string = enc_file_path_string

    # S3: hash_enc_blob -> enc_blob_path.
    self.hash_enc_blob = hash_enc_blob
    self.enc_blob_path = enc_blob_path

    # SDB: hash_enc_file_path -> [ (hash_enc_blob, hash_prev_blob) ].
    self.hash_prev_blob = hash_prev_blob


  def update_storage(self):
    self.blob_store.put_string(
      self.hash_enc_file_path, self.enc_file_path_string)
    self.blob_store.put_filename(self.hash_enc_blob, self.enc_blob_path)


  def update_metadata(self):
    """Should account for VersioningConflict."""
    success, lock = self.metadata_store.acquire_lock(hash_file_path)
    if not success:
      logging.error('Could NOT get lock on object.')
      return False

    # New file so we should also set the file_path.
    if self.hash_prev_obj:
      logging.info('Metadata like a new file.')
      self.metadata_store.set_path(
        self.hash_file_path, self.hash_enc_file_path_path)

    try:
      self.metadata_store.update_object(
        self.hash_file_path, self.hash_enc_file, self.hash_prev_obj)
    except VersioningConflict:
      self.metadata_store.release_lock(lock)
      raise

    self.metadata_store.release_lock(lock)
    return True


def detected_new_file(new_file_fp, recipients):
  logging.debug('Entered detected_new_file.')
  gpg = gnupg.GPG()

  # Write out temporary GPG file to temp directory.
  with tempfile.NamedTemporaryFile(delete=False) as enc_tmp_file:
    edata = gpg.encrypt_file(new_file_fp,
                             recipients,
                             always_trust=True,
                             armor=True,
                             output=enc_tmp_file.name)
    enc_file_name = enc_tmp_file.name
  logging.info('Finished encrypting the original file.')

  # Get the SHA1 of the encrypted file.
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
  logging.info("Upload to S3: SHA1(PGP(filepath)): '%s' data: '%s'" % \
                 (sha_enc_fp, enc_filepath.data))

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
  os.system('rm /tmp/tmp*')

  logging.info('Creating file.')
  with tempfile.NamedTemporaryFile(delete=False) as tmp:
    # tmp.write('hello world ' * 100000000)
    tmp.write('hello world ' * 100000)
    tmp.seek(0)
    name = detected_new_file(tmp, ["\'Matt Tierney\'"])
    # os.remove(tmp.name)
  print "Done."

  print 'Here is the file returned from detected_new_file:'
  with open(name) as fh:
    data = "".join(fh.readlines())

  print 'Upload to S3: SHA1(PGP(file)): \'%s\' data: %s' % \
      (_sha1_of_file(name), data[:1000])

  # os.remove(name)

