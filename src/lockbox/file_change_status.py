#!/usr/bin/env python
"""Provides the FileChangeStatus message as well as corresponding SQLite
converter and adapter."""

import cPickle
import os
import logging
import sqlite3
from util import enum
import watchdog.events


_POSSIBLE_STATES = enum('PREPARE', 'CANCELED', 'UPLOADING', 'FAILED')


class FileChangeStatus(object):
  def __init__(self, timestamp, event):
    assert isinstance(timestamp, float)
    self.timestamp = timestamp
    self.state = _POSSIBLE_STATES.PREPARE
    self.event_type = event.event_type
    self.is_directory = event.is_directory
    self.src_path = event.src_path
    self.dest_path = None
    if event.event_type is watchdog.events.EVENT_TYPE_MOVED:
      self.dest_path = event.dest_path

  def __conform__(self, protocol):
    if protocol is sqlite3.PrepareProtocol:
      return '%f;%d;%s;%d;%s;%s' % (self.timestamp, self.state, self.event_type,
                                    self.is_directory, self.src_path,
                                    self.dest_path)


  def __repr__(self):
    return '(%f;%d;%s;%d;%s;%s)' % (self.timestamp, self.state, self.event_type,
                                    self.is_directory, self.src_path,
                                    self.dest_path)


def adapt_file_change_status(file_change_status):
  return '%f;%d;%s;%d;%s;%s' % (self.timestamp, self.state, self.event_type,
                                self.is_directory, self.src_path,
                                self.dest_path)


def convert_file_change_status(string):
  untyped_timestamp, untyped_state, untyped_event_type,\
      untyped_is_directory, untyped_src_path, untyped_dest_path =\
      string.split(';')

  return FileChangeStatus(int(untyped_state),
                          str(untyped_event_type), int(untyped_is_directory),
                          str(untyped_src_path), str(untyped_dest_path))

sqlite3.register_adapter(FileChangeStatus, adapt_file_change_status)
sqlite3.register_converter('filechangestatus', convert_file_change_status)
