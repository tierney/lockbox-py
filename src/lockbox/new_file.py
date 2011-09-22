#!/usr/bin/env python
"""
Protocols:
  Download a file or delta. Once the file is locally constructed in a temporary
  file, calculate the signature of the file and store the signature value
  locally. Also, store the SHA1 of the file as it was posted online. These
  values will enable us to correctly calculate the DeltaFile as well as produce
  a correct backpointer when uploading a delta update.
"""


import logging
FORMAT = "%(asctime)-15s %(levelname)s %(module)-8s %(message)s"
logging.basicConfig(level=logging.INFO,
                    format=FORMAT)


from exception import VersioningError
from boto import connect_sdb
import gnupg
import os
import re
import tempfile
import gflags
from hashlib import sha1
from simpledb import _sha1_of_file, add_path, get_domain, _print_all_domain, \
    acquire_domain_object_lock, add_object_delta, \
    release_domain_object_lock, _sha1_of_string
from crypto_util import hash_string, hash_filename


FLAGS = gflags.FLAGS
gflags.DEFINE_multistring('basepath', '/tmp/lockbox/',
                          'Base filepath(s) for Lockbox.')
gflags.DEFINE_string('lock_domain', 'group0_lock', 'Lock domain for a group.')
gflags.DEFINE_string('data_domain', 'group0_data', 'Data domain for a group.')


class LockboxFileUpdater(object):
  """Interacts directly with the stores blob and metadata store. Sets values in
  the meatdata store and uploads files to the stores.

  Args:
    blob_store: Interface to the durable, eventually-consistent blob store.
    metadata_store: Interface to the strongly-consistent metadata store.
    crypto_file_update:
    hash_of_prev_blob:
  """

  
  def __init__(self, blob_store, metadata_store, crypto_file_update,
               hash_of_prev_blob=''):
    """Sets up the basic components for performing updates."""
    # Stores.
    self.blob_store = blob_store
    self.metadata_store = metadata_store

    self.hash_of_file_path = crypto_file_update.hash_of_file_path

    # SDB: 'path' -> hash_of_raw_data_of_encrypted_blob_path.
    self.hash_of_raw_data_of_encrypted_blob_path =\
      crypto_file_update.hash_of_raw_data_of_encrypted_blob_path

    # S3: hash_of_raw_data_of_encrypted_blob_path ->
    #                                      raw_data_of_encrypted_blob_path.
    self.raw_data_of_encrypted_blob_path =\
      crypto_file_update.raw_data_of_encrypted_blob_path

    # S3: hash_of_encrypted_blob -> path_to_encrypted_blob.
    self.hash_of_encrypted_blob = crypto_file_update.hash_of_encrypted_blob
    self.path_to_encrypted_blob = crypto_file_update.path_to_encrypted_blob

    # SDB: hash_of_raw_data_of_encrypted_blob_path ->
    #         [ (hash_of_encrypted_blob, hash_of_prev_blob) ].
    self.hash_of_prev_blob = hash_of_prev_blob


  def update_storage(self):
    self.blob_store.put_string(self.hash_of_raw_data_of_encrypted_blob_path,
                               self.raw_data_of_encrypted_blob_path)
    self.blob_store.put_filename(self.hash_of_encrypted_blob,
                                 self.path_to_encrypted_blob)


  def update_metadata(self):
    """Should account for VersioningError."""
    success, lock = self.metadata_store.acquire_lock(self.hash_of_file_path)
    if not success:
      logging.error('Could NOT get lock on object.')
      return False

    # New file so we should also set the file_path.
    if not self.hash_of_prev_blob:
      logging.info('Metadata like a new file.')
      self.metadata_store.set_path(
        self.hash_of_file_path, self.hash_of_raw_data_of_encrypted_blob_path)

    try:
      self.metadata_store.update_object(
        self.hash_of_file_path, self.hash_of_encrypted_blob, self.hash_of_prev_blob)
    except VersioningError:
      self.metadata_store.release_lock(lock)
      raise

    self.metadata_store.release_lock(lock)
    return True


from librsync import SigFile, DeltaFile


class CryptoForFileUpdate(object):
  """
  Attributes:
    gpg: GPG module.
    file_path: Path to file.
    recipients: List of recipients. Should correspond to GPG uids or keyids or
      fingerprints that have ALREADY BEEN VALIDATED before being passed in.
    hash_of_encrypted_blob: SHA1 of the PGP-encrypted file.
    raw_data_of_encrypted_blob_path: Raw data of the PGP-encrypted blob path.
    path_to_encrypted_blob:
    hash_of_raw_data_of_encrypted_blob_path:
  """
  
  
  def __init__(self, gpg, file_path, recipients):
    self.gpg = gpg
    self.file_path = file_path
    self.recipients = recipients
    self.hash_of_file_path = ''
    self.hash_of_encrypted_blob = ''
    self.path_to_encrypted_blob = ''
    self.hash_of_raw_data_of_encrypted_blob_path = ''
    self.raw_data_of_encrypted_blob_path = ''


  def run(self):
    try:
      os.path.exists(self.file_path)
      self.hash_of_file_path = hash_string(self.file_path)
    except Exception, e:
      logging.error(e)
      raise

    # Calculate rsync signature to be used when calculating / applying deltas.
    with open(self.file_path) as cleartext_file:
      sigfile = SigFile(cleartext_file)
    self.ascii_signature = binascii.b2a_base64(sigfile.read())

    # GPG-encrypt and hash the file, filepath.
    with open(self.file_path) as cleartext_file:
      with tempfile.NamedTemporaryFile(delete=False) as encrypted_blob_file:
        self.path_to_encrypted_blob = encrypted_blob_file.name
        edata = self.gpg.encrypt_file(cleartext_file, self.recipients,
                                      always_trust=True, armor=False,
                                      output=self.path_to_encrypted_blob)

    self.hash_of_encrypted_blob = hash_filename(self.path_to_encrypted_blob)
    encrypted_blob_path = self.gpg.encrypt(self.file_path, self.recipients,
                                           always_trust=True, armor=False)

    self.raw_data_of_encrypted_blob_path = encrypted_blob_path.data
    self.hash_of_raw_data_of_encrypted_blob_path =\
      hash_string(self.raw_data_of_encrypted_blob_path)
  

  def cleanup(self):
    if not os.path.exists(self.path_to_encrypted_blob):
      logging.error('Temporary encrypted file disappeared; original file %s.' % 
                    self.file_path)
    os.remove(self.path_to_encrypted_blob)


def detected_new_file(new_file_fp, recipients):
  logging.debug('Entered detected_new_file.')
  gpg = gnupg.GPG()

  # Write out temporary GPG file to temp directory.
  with tempfile.NamedTemporaryFile(delete=False) as enc_tmp_file:
    edata = gpg.encrypt_file(new_file_fp,
                             recipients,
                             always_trust=True,
                             armor=False,
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
                             armor=False)

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


def main_backup():
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


class GPGTest(object):
  fingerprints = []


  def __init__(self, gpg):
    self.gpg = gpg


  def __del__(self):
    self.delete_keys()
    

  def delete_keys(self):
    for fingerprint in self.fingerprints:
      logging.info('Deleting: %s.' % fingerprint)
      self.gpg.delete_keys(fingerprint, secret=True)
      self.gpg.delete_keys(fingerprint)
    

  def generate_key(self, first_name, last_name, domain,
                   comment='', passphrase=None):
    """Generate a key"""
    params = {
      'Key-Type': 'DSA',
      'Key-Length': 1024,
      'Subkey-Type': 'ELG-E',
      'Subkey-Length': 4096,
      'Name-Comment': comment,
      'Expire-Date': 0,
      }
    params['Name-Real'] = '%s %s' % (first_name, last_name)
    params['Name-Email'] = ('%s.%s@%s' % (first_name, last_name, domain)).lower()
    if passphrase is None:
      passphrase = ('%s%s' % (first_name[0], last_name)).lower()
    params['Passphrase'] = passphrase
    cmd = self.gpg.gen_key_input(**params)
    return self.gpg.gen_key(cmd)


  def generate_keys(self):
    result = self.generate_key(self.gpg, 'George', 'Washington', '1789.com',
                               'First President.')
    self.fingerprints.append(result.fingerprint)
    logging.info('Generated key %s.' % result.fingerprint)
    result = self.generate_key(self.gpg, 'John', 'Adams', '1787.com',
                               'Second President.')
    self.fingerprints.append(result.fingerprint)
    logging.info('Generated key %s.' % result.fingerprint)
    result = self.generate_key(self.gpg, 'Thomas', 'Jefferson', '1801.com',
                               'Third President.')
    self.fingerprints.append(result.fingerprint)
    logging.info('Generated key %s.' % result.fingerprint)
    result = self.generate_key(self.gpg, 'James', 'Madison', '1809.com',
                               'Fourth President.')
    self.fingerprints.append(result.fingerprint)  
    logging.info('Generated key %s.' % result.fingerprint)
    result = self.generate_key(self.gpg, 'James', 'Monroe', '1817.com',
                               'Fifth President.')
    self.fingerprints.append(result.fingerprint)
    logging.info('Generated key %s.' % result.fingerprint)
    


from S3 import BlobStore
from simpledb import AsyncMetadataStore
from boto import connect_s3, connect_sdb


def main():
  """NB: Sharing a new file means having to reencrypt the file with the new set
  of keys."""
  # Useful strings.
  blob_bucket_name = 'safe-deposit-box'
  lock_domain_name = 'group0_lock'
  data_domain_name = 'group0_data'

  # Blob store setup.
  blob_conn = connect_s3()
  blob_store = BlobStore(blob_conn, blob_bucket_name)
  logging.info('BlobStore initialized.')

  # Metdata store setup.
  metadata_conn = connect_sdb()
  metadata_store = AsyncMetadataStore(
    metadata_conn, lock_domain_name, data_domain_name)
  logging.info('MetadataStore initialized.')

  # Generate the file that we use for testing.
  logging.info('Generating file contents.')
  rand_contents = os.urandom(10 * 2 ** 20)
  with tempfile.NamedTemporaryFile(delete=False) as tmp:
    tmp.write(rand_contents)
    filepath = tmp.name
  logging.info('File written.')

  # GPG setup.
  gpg = gnupg.GPG()
  # gpgtest = GPGTest(gpg)
  # gpgtest.generate_keys()
  recipients = ["John Adams", "George Washington"]
  escaped_recipients = ["\'%s\'" % (recipient) for recipient in recipients]

  with open(filepath) as fp:
    sigfile = SigFile(fp)
  
  crypto = CryptoForFileUpdate(gpg, filepath, escaped_recipients)
  crypto.run()
  logging.info('Finished GPG.')

  # Configuring the updater.
  updater = LockboxFileUpdater(blob_store, metadata_store, crypto,
                               hash_of_prev_blob='')

  # Sending the metadata.
  logging.info('Sending metadata.')
  updater.update_metadata()
  logging.info('Updated metadata.')

  # Sending the blobs.
  logging.info('Sending blob.')
  updater.update_storage()
  logging.info('Updated blob.')

  # Cleanup after the GPG.
  # crypto.cleanup()

  # Local GPG cleanup.
  # gpgtest.delete_keys()
  
  # Cleanup the tmepfile.
  os.remove(filepath)

if __name__ == '__main__':
  main()
