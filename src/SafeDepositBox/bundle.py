import hashlib
import os

from S3Interface import S3Bucket
 
def _hash_path(filepath):
  return hashlib.md5(filepath).hexdigest()

def _hash_flatten_filepath(filepath):
  fphash = _hash_path(filepath)
  return ".".join([fphash, os.path.split(filepath)[1]])

class AWSFileBundle(object):
  '''Stores the state for a single file.
  
Files are encrypted and versioned; delta compression is applied based on 
previous versions to reduce the amount of data stored.
'''
  def __init__(self, crypto_helper):
    self.crypto = crypto_helper    
  
  def bundle(self, filepath):
    zf = zipfile.ZipFile(filepath, mode='w', compression=zipfile.ZIP_DEFLATED)    
    key, salt, filename = self.encrypt(filepath)    
    zf.write(filename, 'content')
    zf.writestr('key', key)
    zf.writestr('salt', salt)
    zf.close()
    
  def unbundle(self, bundle_filename):
    zf = zipfile.ZipFile(bundle_filename, mode='r')
    key = zf.read('key')
    salt = zf.read('salt')
    enc_file = zf.extract('content', self.staging_directory)
    self.decrypt(enc_file, key, salt)
    
    