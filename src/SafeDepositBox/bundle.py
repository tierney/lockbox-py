import hashlib
import json
import os
import base64
from util import log, tempfile

class FileNotFound(Exception): pass
class PermissionDenied(Exception): pass

AESKEY_FILE = 'aes.key'
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
  def __init__(self, conf, bucket, file_name, crypto_helper):
    self.bucket = bucket
                                
    self.crypto = crypto_helper    
    self.dir = self.bucket.create_dir(_hash_path(file_name))
    self.conf = conf
    self.enc_aes_keys = dict()
    
    try:
      self.load_key_file()
    except FileNotFound:
      log.warn("Key files not present. Creating new ones.")
      # Create a new key for this bucket, and upload.
      self.aes_key = self.crypto.generate_aes_key()
      log.info("New AES key (base64): %s" % base64.encodestring(self.aes_key))
      self.enc_aes_keys[self.conf['email_address']] = base64.encodestring(self.crypto.encrypt_aes_key(self.aes_key))
      self.flush_keny_file() 
  
  def load_key_file(self):
    '''Attempt to load the encrypted AES key for the given folder.'''
    # expects that AESKEY_FILE is a json'd dictionary (i.e., argument
    # for loads is a str)
    key_file_str = self.dir.read(AESKEY_FILE)
    if not key_file_str:
      raise FileNotFound
    self.enc_aes_keys = json.loads(key_file_str)
    
    if not self.conf.user_id() in self.enc_aes_keys:
      raise PermissionDenied, 'Current user cannot decrypt file %s' % self.file_name
    
    self.aes_key = self.crypto.decrypt_aes_key(self.enc_aes_keys[self.conf.user_id()])
  
  def flush_key_file(self):
    '''Write a new keyfile containing encrypted aes keys.'''
    self.dir.write(AESKEY_FILE, json.dumps(self.enc_aes_keys))
    
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
    
