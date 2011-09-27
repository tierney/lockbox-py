#!/usr/bin/env python

import sys
import yaml
import zlib

# Utility functions.
def enum(*sequential, **named):
  """Automatic enumeration of sequential arguments."""
  enums = dict(zip(sequential, range(len(sequential))), **named)
  return type('Enum', (), enums)


# Global enums.
_VERSION = 1
_NOTIFICATION_TYPES = enum('UPLOAD_PROGRESS', 'FS_EVENT')
_FS_EVENT_TYPES = enum('MODIFIED', 'CREATED', 'MOVED', 'DELETED')


class Notification(object):
  def __init__(self, user, timestamp, notification_type):
    # TODO(tierney): Verify notification_type.
    assert isinstance(timestamp, float)
    self.__dict__ = { 'version' : _VERSION,
                      'user' : user,
                      'timestamp' : timestamp,
                      'notification_type' : notification_type }


class ProgressNotification(Notification):
  def __init__(self, user, timestamp, notification_type, uploaded_bytes,
               total_bytes, elapsed_time):
    super(ProgressNotification, self).__init__(user, timestamp, notification_type)
    assert isinstance(uploaded_bytes, float)
    assert isinstance(total_bytes, float)
    assert isinstance(elapsed_time, float)
    assert uploaded_bytes >= 0.0
    assert total_bytes >= 0.0
    assert elapsed_time >= 0.0

    self.__setattr__('uploaded_bytes', uploaded_bytes)
    self.__setattr__('total_bytes', total_bytes)
    self.__setattr__('elapsed_time', elapsed_time)


class FSEventNotification(Notification):
  def __init__(self, user, timestamp, notification_type, fs_event_type,
               is_directory, src_path, dest_path=None):
    super(FSEventNotification, self).__init__(user, timestamp, notification_type)
    assert isinstance(is_directory, bool)
    self.__setattr__('fs_event_type', fs_event_type)
    self.__setattr__('is_directory', is_directory)
    self.__setattr__('src_path', src_path)
    if dest_path:
      self.__setattr__('dest_path', dest_path)


class NotificationSerializer(object):
  """Assumes we use both yaml and zlib libraries. Designed to make a compact and
  portable serialization for notifications in Lockbox."""
  @staticmethod
  def serialize(obj):
    return zlib.compress(yaml.dump(obj))

  @staticmethod
  def deserialize(obj):
    return yaml.load(zlib.decompress(obj))


def main(argv):
  import time

  pn = ProgressNotification('username', time.time(),
                            _NOTIFICATION_TYPES.UPLOAD_PROGRESS,
                            3.14, 15.93, 15.10)

  fn = FSEventNotification('username', time.time(),
                           _NOTIFICATION_TYPES.FS_EVENT,
                           _FS_EVENT_TYPES.MODIFIED,
                           False, '/somewhere/down/the/path')

  import json
  jds = json.dumps(fn.__dict__)
  print 'json:', len(zlib.compress(jds))

  print len(yaml.dump(fn))
  compressed_yamled_obj = zlib.compress(yaml.dump(fn))
  print 'zlib yaml:', len(compressed_yamled_obj)
  yamled_obj = zlib.decompress(compressed_yamled_obj)
  print yaml.load(yamled_obj)

  cloud_obj = NotificationSerializer.serialize(fn)
  print len(cloud_obj)
  print NotificationSerializer.deserialize(cloud_obj)

if __name__=='__main__':
  main(sys.argv)
