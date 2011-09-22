#!/usr/bin/env python
"""
Usage:
    lockbox_event_handler = LockboxEventHandler()

    observer = Observer()
    observer.schedule(lockbox_event_handler, file_path, recursive=True)
    observer.start()

    # Stuff happens to file system and we know about it.

    observer.stop()
    observer.join()
"""


__author__ = 'tierney@cs.nyu.edu (Matt Tierney)'


from watchdog.events import FileSystemEventHandler, FileMovedEvent, \
    DirMovedEvent, FileModifiedEvent, DirModifiedEvent, FileCreatedEvent, \
    DirCreatedEvent, FileDeletedEvent, DirDeletedEvent


class LockboxEventHandler(FileSystemEventHandler):
  """
  Special case: When a file is moved *from* the watched directory *to* a
  different, unwatched path, then the event will not register with our event
  handler. To catch this case, we must periodically call DirectorySnapshot to
  catch any files that move out of our watched file path.
  """
  def __init__(self, lockbox_sp=None):
    # Initialize the superclass.
    self.lockbox_sp = lockbox_sp

    
  def on_any_event(self, event):
    # log values from here?
    print event.event_type
    print event.is_directory
    print event.src_path
    if self.lockbox_sp: self.lockbox_sp.run()


  def on_created(self, event):
    """Create a new set of..."""
    if isinstance(event, DirCreatedEvent):
      pass
    if isinstance(event, FileCreatedEvent):
      pass


  def on_deleted(self, event):
    """Just detect that we have a deleted event and remove the corresponding
    values from the current view. Future: we will want to keep the values around
    in the cloud until a cleaner time."""
    if isinstance(event, DirDeletedEvent):
      pass
    if isinstance(event, FileDeletedEvent):
      pass


  def on_modified(self, event):
    if isinstance(event, DirModifiedEvent):
      print 'on_modified:', event.src_path
    if isinstance(event, FileModifiedEvent):
      print 'on_modified:', event.src_path


  def on_moved(self, event):
    """Assuming that the filepath is the stored SHA2, then we can detect the
    change"""
    if isinstance(event, DirMovedEvent):
      for moved_event in event.sub_moved_events():
        pass

    if isinstance(event, FileMovedEvent):
      print 'on_moved:', event.src_path
      print 'on_moved:', event.dest_path

