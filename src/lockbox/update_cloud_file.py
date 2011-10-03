#!/usr/bin/env python

import logging
from S3 import BlobStore
from simpledb import AsyncMetadataStore
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
    assert isinstance(metadata_store, AsyncMetadataStore)
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


  def update_storage(self):
    # TODO(tierney): If these should fail, we should undo the operation of the
    # update_metadata. How do we achieve isolation when we can only communiate
    # through a shared medium like SimpleDB?
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

