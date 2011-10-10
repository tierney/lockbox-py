#!/usr/bin/env python

import logging
import threading
import time
from crypto_util import hash_string
from file_update_crypto import FileUpdateCrypto
from update_cloud_file import UpdateCloudFile
from random import randint
from util import enum
from exception import VersioningError
from file_change_status import STATUS_PREPARE, STATUS_CANCELED, \
    STATUS_UPLOADING, STATUS_FAILED, STATUS_COMPLETED, STATUS_ENCRYPTING
from watchdog.events import EVENT_TYPE_CREATED, EVENT_TYPE_MODIFIED, \
    EVENT_TYPE_DELETED, EVENT_TYPE_MOVED, FileMovedEvent, FileDeletedEvent, \
    FileCreatedEvent, FileModifiedEvent


SHEPHERD_STATE_READY = 'ready'
SHEPHERD_STATE_ASSIGNED = 'assigned'
_SHEPHERD_STATE_ASSIGNED_AND_READY = 'assigned_and_ready'
SHEPHERD_STATE_ENCRYPTING = 'encrypting'
SHEPHERD_STATE_UPLOADING = 'uploading'
SHEPHERD_STATE_SHUTDOWN = 'shutdown'


class LocalFileShepherd(threading.Thread):
  def __init__(self, mediator, gpg, blob_store, metadata_store):
    threading.Thread.__init__(self)
    self.mediator = mediator
    self.gpg = gpg
    self.blob_store = blob_store
    self.metadata_store = metadata_store
    self.state = SHEPHERD_STATE_READY


  def shutdown(self):
    # TODO(tierney): Call the MultiPartUpload cancel.
    logging.info('Shutdown not fully implemented.')
    self.state = SHEPHERD_STATE_SHUTDOWN


  def _lookup_previous(self):
    logging.info('Looking up local view of previous (%s).' %
                 self.crypto.hash_of_file_path)
    self.previous = self.metadata_store.local_view_of_previous(
      self.crypto.hash_of_file_path)
    logging.info('Previous set to (%s).' % self.previous)


  def _lookup_recipients(self):
    logging.warning('_lookup_recipients not implemented yet.')
    logging.warning('Must escape recipients.')
    self.escaped_recipients = ['\"Matt Tierney\"']


  def _get_crypto_info(self):
    self._lookup_recipients()
    self.crypto = FileUpdateCrypto(
      self.gpg, self.src_path, self.escaped_recipients)
    self.crypto.hash_file_path()


  def _run_encryption(self):
    self.crypto.run()


  def _update_cloud_file(self):
    """Should already have set self.crypto."""
    self.updater = UpdateCloudFile(self.blob_store, self.metadata_store,
                                   self.crypto, self.previous)

    logging.info('Sending metadata.')
    if not self.updater.update_metadata():
      logging.warning('Could not update the metadata.')
      return False

    logging.info('Updated metadata.')

    logging.info('Sending blobdata.')
    self.updater.update_storage()
    logging.info('Updated blobdata.')


  def assign(self, status_id, timestamp, state, event_type, src_path,
             dest_path):
    self.state = SHEPHERD_STATE_ASSIGNED
    self.status_id = status_id
    self.timestamp = timestamp
    self.state = state
    self.event_type = event_type
    self.src_path = src_path
    self.dest_path = dest_path
    self.state = _SHEPHERD_STATE_ASSIGNED_AND_READY


  def get_state(self):
    return self.state


  def _clear(self):
    del self.status_id, self.timestamp, self.state, self.event_type, \
        self.src_path, self.dest_path, self.crypto, self.previous


  def run(self):
    while self.state is not SHEPHERD_STATE_SHUTDOWN:
      if self.state is SHEPHERD_STATE_READY:
        time.sleep(1)
        continue

      if self.state is _SHEPHERD_STATE_ASSIGNED_AND_READY:
        logging.info('Got event (%d, %f, %s, %s, %s, %s).'
                     % (self.status_id, self.timestamp, self.state,
                        self.event_type, self.src_path, self.dest_path))
        logging.info('Time to encrypt.')
        self.mediator.update(self.status_id, STATUS_ENCRYPTING)
        self.state = SHEPHERD_STATE_ENCRYPTING


      if self.state is SHEPHERD_STATE_ENCRYPTING:
        logging.info('Encrypting.')
        self._get_crypto_info()
        self._lookup_previous()
        if self.event_type == EVENT_TYPE_CREATED:
          self._run_encryption()
        elif self.event_type == EVENT_TYPE_MODIFIED:
          logging.warning('EVENT_TYPE_MODIFIED encryption not implemented yet.')
          self._run_encryption()

        logging.info('Finished encrypting.')
        self.mediator.update(self.status_id, STATUS_UPLOADING)
        self.state = SHEPHERD_STATE_UPLOADING


      if self.state is SHEPHERD_STATE_UPLOADING:
        logging.info('Uploading.')
        try:
          self._update_cloud_file()
        except VersioningError:
          logging.error('Got a VersioningError so did not upload (%s).' %
                        self.src_path)


        logging.info('Done.')
        self.mediator.update(self.status_id, STATUS_COMPLETED)
        self.mediator.done(self.src_path, self.ident)
        self._clear()

        self.state = SHEPHERD_STATE_READY

