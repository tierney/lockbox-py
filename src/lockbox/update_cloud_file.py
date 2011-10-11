#!/usr/bin/env python

import logging
from binascii import b2a_base64
from blob_store import BlobStore
from exception import VersioningError
from metadata_store import MetadataStore
from file_update_crypto import FileUpdateCrypto

class UpdateCloudFile(object):
  """Interacts directly with the stores blob and metadata store. Sets values in
  the meatdata store and uploads files to the stores.

  Args:
    blob_store: Interface to the durable, eventually-consistent blob store.
    metadata_store: Interface to the strongly-consistent metadata store.
    file_update_crypto:
    hash_of_prev_blob:
  """
  def __init__(self, blob_store, metadata_store, file_update_crypto,
               hash_of_prev_blob=''):
    assert isinstance(blob_store, BlobStore)
    assert isinstance(metadata_store, MetadataStore)
    assert isinstance(file_update_crypto, FileUpdateCrypto)

    """Sets up the basic components for performing updates."""
    # Data stores.
    self.blob_store = blob_store
    self.metadata_store = metadata_store

    self.hash_of_file_path = file_update_crypto.hash_of_file_path

    # SDB: 'path' -> hash_of_raw_data_of_encrypted_blob_path.
    self.hash_of_raw_data_of_encrypted_blob_path =\
      file_update_crypto.hash_of_raw_data_of_encrypted_blob_path

    # S3: hash_of_raw_data_of_encrypted_blob_path ->
    #                                      raw_data_of_encrypted_blob_path.
    self.raw_data_of_encrypted_blob_path =\
      file_update_crypto.raw_data_of_encrypted_blob_path

    # S3: hash_of_encrypted_blob -> path_to_encrypted_blob.
    self.hash_of_encrypted_blob = file_update_crypto.hash_of_encrypted_blob
    self.path_to_encrypted_blob = file_update_crypto.path_to_encrypted_blob

    # SDB: hash_of_raw_data_of_encrypted_blob_path ->
    #         [ (hash_of_encrypted_blob, hash_of_prev_blob) ].
    self.hash_of_prev_blob = hash_of_prev_blob


  def update_path(self):
    logging.info('Path blobs (%s) : (%s).' %
                 (self.hash_of_raw_data_of_encrypted_blob_path,
                  b2a_base64(self.raw_data_of_encrypted_blob_path)))
    self.blob_store.put_string(self.hash_of_raw_data_of_encrypted_blob_path,
                               b2a_base64(self.raw_data_of_encrypted_blob_path))


  def update_blob(self):
    logging.info('Encrypted blobs (%s) : (%s).' % (self.hash_of_encrypted_blob,
                                                   self.path_to_encrypted_blob))
    self.blob_store.put_filename(self.hash_of_encrypted_blob,
                                 self.path_to_encrypted_blob)


  def update_storage(self):
    logging.error('-------> DEPRECATED <--------')
    # TODO(tierney): Failure rollback?
    self.update_path()
    self.update_blob()


  def update_metadata(self):
    """Should account for VersioningError."""
    success, lock = self.metadata_store.acquire_lock(self.hash_of_file_path)
    if not success:
      logging.error('Could NOT get lock on object.')
      return False

    # New file so we should also set the file_path.
    if not self.hash_of_prev_blob:
      logging.info('Metadata like a NEW file.')
      self.metadata_store.set_path(
        self.hash_of_file_path, self.hash_of_raw_data_of_encrypted_blob_path)

    try:
      self.metadata_store.update_object(
        self.hash_of_file_path, self.hash_of_encrypted_blob, self.hash_of_prev_blob)
    except VersioningError:
      logging.error('Got a versioning error. Releasing lock on (%s).' %
                    self.hash_of_file_path)
      self.metadata_store.release_lock(lock)
      raise

    self.metadata_store.release_lock(lock)
    return True

