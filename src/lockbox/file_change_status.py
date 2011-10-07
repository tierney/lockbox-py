#!/usr/bin/env python
"""Provides the FileChangeStatus message as well as corresponding SQLite
converter and adapter."""

import cPickle
import os
import logging
import sqlite3
from util import enum
import watchdog.events
from watchdog.events import EVENT_TYPE_CREATED, EVENT_TYPE_MODIFIED, \
    EVENT_TYPE_DELETED, EVENT_TYPE_MOVED, FileMovedEvent, FileDeletedEvent, \
    FileCreatedEvent, FileModifiedEvent

STATUS_PREPARE = 'prepare'
STATUS_CANCELED = 'canceled'
STATUS_ENCRYPTING = 'encrypting'
STATUS_UPLOADING = 'uploading'
STATUS_FAILED = 'failed'
STATUS_COMPLETED = 'completed'

class FileChangeStatus(object):
  def __init__(self, timestamp, event, state=STATUS_PREPARE):
    assert isinstance(timestamp, float)
    self.timestamp = timestamp
    self.state = state
    self.event_type = event.event_type
    self.src_path = event.src_path
    self.dest_path = ''
    if event.event_type is watchdog.events.EVENT_TYPE_MOVED:
      self.dest_path = event.dest_path


  def __conform__(self, protocol):
    if protocol is sqlite3.PrepareProtocol:
      return '%f;%s;%s;%s;%s' % (self.timestamp, self.state, self.event_type,
                                 self.src_path, self.dest_path)


  def __repr__(self):
    return '(%f;%s;%s;%s;%s)' % (self.timestamp, self.state, self.event_type,
                                 self.src_path, self.dest_path)


def adapt_file_change_status(file_change_status):
  return '%f;%s;%s;%s;%s' % (
    file_change_status.timestamp, file_change_status.state,
    file_change_status.event_type, file_change_status.src_path,
    file_change_status.dest_path)


def convert_file_change_status(string):
  str_timestamp, str_state, str_event_type,\
      str_src_path, str_dest_path = string.split(';')
  event = None
  if str_event_type == EVENT_TYPE_MOVED:
    event = FileMovedEvent(str_src_path, str_dest_path)
  if str_event_type == EVENT_TYPE_DELETED:
    event = FileDeletedEvent(str_src_path)
  if str_event_type == EVENT_TYPE_CREATED:
    event = FileCreatedEvent(str_src_path)
  if str_event_type == EVENT_TYPE_MODIFIED:
    event = FileModifiedEvent(str_src_path)

  return FileChangeStatus(float(str_timestamp), event, str_state)


sqlite3.register_adapter(FileChangeStatus, adapt_file_change_status)
sqlite3.register_converter('filechangestatus', convert_file_change_status)
