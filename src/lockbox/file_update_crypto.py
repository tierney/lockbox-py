#!/usr/bin/env python
"""Provides hashing and hybrid cryptosystem functionality."""

import logging
import os
from binascii import b2a_base64, a2b_base64
from crypto_util import hash_string, hash_filename
from librsync import SigFile, DeltaFile
from tempfile import NamedTemporaryFile


class FileUpdateCrypto(object):
  # MAJOR TODO(tierney): Manipulate files in temp before attempting
  # calculations, etc. in case the file changes. OR let the watchdog cancel
  # events, but we may want to include both measures (manip in temp only AND
  # watchdog cancellations).
  """
  Attributes:
    gpg: GPG module.
    file_path: Path to file.
    recipients: List of recipients. Should correspond to GPG uids or keyids or
      fingerprints that have ALREADY BEEN VALIDATED before being passed in.
    hash_of_encrypted_blob: SHA1 of the PGP-encrypted file.
    raw_data_of_encrypted_blob_path: Raw data of the PGP-encrypted blob path.
    path_to_encrypted_blob:
    hash_of_raw_data_of_encrypted_blob_path: This is the key in S3 for the
      decryptable raw data of the blob path.
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
    self.delta_file_path = ''


  def run(self):
    self.hash_file_path()
    self.rsync_signature()
    self.encrypt()


  def hash_file_path(self):
    try:
      os.path.exists(self.file_path)
      self.hash_of_file_path = hash_string(self.file_path)
    except Exception, e:
      logging.error(e)
      raise


  def rsync_signature(self):
    """Calculate rsync signature of entire file to be used when calculating /
    applying deltas."""
    with open(self.file_path) as cleartext_file:
      sigfile = SigFile(cleartext_file)
      self.ascii_signature = b2a_base64(sigfile.read())
    logging.info('File (%s) signature: (%s).' %
                 (self.file_path, self.ascii_signature))


  def compute_cleartext_delta(self, prev_signature, latest_filename):
    with NamedTemporaryFile(delete=False) as cleartext_delta_file:
      with open(latest_filename) as latest_file:
        delta_file = DeltaFile(a2b_base64(prev_signature), latest_file)
        delta = b2a_base64(delta_file.read())
      cleartext_delta_file.write(delta)
      self.delta_file_path = cleartext_delta_file.name
      return cleartext_delta_file.name


  def encrypt_delta_file(self):
    assert os.path.exists(self.delta_file_path)
    self.encrypt_file(self.delta_file_path)


  def encrypt_file(self, file_path):
    # GPG-encrypt and hash the file, filepath.
    with open(file_path) as cleartext_file:
      with NamedTemporaryFile(delete=False) as encrypted_blob_file:
        self.path_to_encrypted_blob = encrypted_blob_file.name
        self.gpg.encrypt_file(cleartext_file, self.recipients,
                              always_trust=True, armor=False,
                              output=self.path_to_encrypted_blob)
    self.hash_of_encrypted_blob = hash_filename(self.path_to_encrypted_blob)


  def encrypt(self):
    self.encrypt_file(self.file_path)
    self.hash_of_encrypted_blob = hash_filename(self.path_to_encrypted_blob)

    # File path encryption.
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

