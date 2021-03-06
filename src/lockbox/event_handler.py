#!/usr/bin/env python
"""Lockbox FileSystemEventHandler that inherits from the watchdog modules.

Usage:
  lockbox_event_handler = LockboxEventHandler()

  from watchdog.observers import Observer
  observer = Observer()
  observer.schedule(lockbox_event_handler, file_path, recursive=True)
  observer.start()

  # Stuff happens to file system and we know about it.

  observer.stop()
  observer.join()
"""


__author__ = 'tierney@cs.nyu.edu (Matt Tierney)'

import logging
import os
from watchdog.events import FileSystemEventHandler, FileMovedEvent, \
    DirMovedEvent, FileModifiedEvent, DirModifiedEvent, FileCreatedEvent, \
    DirCreatedEvent, FileDeletedEvent, DirDeletedEvent, EVENT_TYPE_MOVED, \
    EVENT_TYPE_DELETED, EVENT_TYPE_CREATED, EVENT_TYPE_MODIFIED


class LockboxEventHandler(FileSystemEventHandler):
  """
  Special case: When a file is moved *from* the watched directory *to* a
  different, unwatched path, then the event will not register with our event
  handler. To catch this case, we must periodically call DirectorySnapshot to
  catch any files that move out of our watched file path.
  """
  def __init__(self, mediator):
    self.mediator = mediator
    self.directory_to_specific_file = dict()


  def specific_file(self, file_path):
    assert os.path.exists(file_path)
    directory_path, file_name = os.path.split(file_path)
    if directory_path not in self.directory_to_specific_file:
      self.directory_to_specific_file[directory_path] = list()
    self.directory_to_specific_file[directory_path].append(file_name)


  def on_any_event(self, event):
    # log values from here?
    log_statement = 'type (%s) is_dir (%s) src (%s)' % \
        (event.event_type, event.is_directory, event.src_path)
    if event.event_type is EVENT_TYPE_MOVED:
      log_statement += ' dest (%s).' % event.dest_path
    else:
      log_statement += '.'

    logging.info(log_statement)
    if event.is_directory:
      logging.info('Do NOT work with directories alone.')
      return

    if not self.mediator.enqueue(event):
      logging.error('Problem with enqueuing message.')

