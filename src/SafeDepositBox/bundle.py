from S3Interface import S3Bucket, S3Policy, FileNotFound
import crypto, hashlib, json, os
from util import log, tempfile

class PermissionDenied(Exception): pass

AESKEY_FILE = './aes.key'
CONTENT_FILE = './content'

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
  def __init__(self, conf, file_name, crypto_helper):
    self.bucket = S3Bucket(bucket_name=conf.bucket(),
                           staging_dir=conf.staging_dir(),
                           access_key=conf.access_key(),
                           secret_key=conf.secret_key())
                                
    self.crypto = crypto_helper    
    self.dir = self.bucket.create_dir(_hash_path(file_name))
    self.conf = conf
    
    try:
      self.load_key_file()
    except FileNotFound:
      # Create a new key for this bucket, and upload.
      self.aes_key = self.crypto.generate_aes_key()
      self.enc_aes_keys[self.conf.user_id()] = self.crypto.encrypt_aes_key(self.aes_key)
      
      self.flush_key_file() 
  
  def load_key_file(self):
    '''Attempt to load the encrypted AES key for the given folder.'''
    self.enc_aes_keys = json.loads(self.dir.read(AESKEY_FILE))
    
    if not self.conf.user_id() in self.enc_aes_keys:
      raise PermissionDenied, 'Current user cannot decrypt file %s' % self.file_name
    
    self.aes_key = self.crypto.decrypt_aes_key(self.enc_aes_keys[self.conf.user_id()])
  
  def flush_key_file(self):
    '''Write a new keyfile containing encrypted aes keys.'''
    self.dir.write(AESKEY_FILE, self.enc_aes_keys)
    
  def add_key(self, userid, pubkey):
    self.enc_aes_keys[userid] = pubkey.public_encrypt(self.aes_key)
    self.flush_key_file()
  
  def add_content(self, input):
    '''Write a new content entry, encrypted using the current AES key.'''
    tf = tempfile(self.conf)
    self.crypto.encrypt(input, tf)
    tf.seek(0)
    self.dir.write(CONTENT_FILE, tf.read())
    del tf
  
  def get_content(self, fp):
    '''Return a file object representing the latest content for this bundle.'''
    enc = tempfile(self.conf)
    dec = tempfile(self.conf)
    self.dir.read_to_file(CONTENT_FILE, enc)
    enc.seek(0)
    self.crypto.decrypt(enc, dec)
    dec.seek(0)
    del enc
    return dec
    