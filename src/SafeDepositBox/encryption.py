#!/usr/bin/env python

import hashlib, os

from S3BucketPolicy import string_to_dns
from util import log, flags, execute, init_dir, remove_file
import zipfile

import M2Crypto

DECODE = 0
ENCODE = 1

def _filter_cipher(input, output, cipher):    
  while 1:
    data = input.read(32000)
    if len(data) == 0:
      break
    enc = cipher.update(data)
    output.write(enc)
  output.write(cipher.final)
  output.close()

def _hash_path(filepath):
  return hashlib.md5(filepath).hexdigest()

def _hash_flatten_filepath(filepath):
  fphash = _hash_path(filepath)
  return ".".join([fphash, os.path.split(filepath)[1]])

class SSLHelper(object):
  def __init__(self, key_dir, use_default_location=True):
    self.key_dir = key_dir
    self.initialize_keys()

  def initialize_keys(self):
    init_dir(self.key_dir)
    priv = os.path.join(self.key_dir, 'sdb.private')
    pub = os.path.join(self.key_dir, 'sdb.public')
    
    try:
      self.key = M2Crypto.RSA.load_key(priv)
      M2Crypto.RSA.load_pub_key(pub)
    except:
      log.warn('Failed to load keys.  Regenerating...')
      self.key = self.generate_pki_keys(priv, pub)
    
  def generate_pki_keys(self, privfile, pubfile):
    k = M2Crypto.RSA.gen_key(2048, 11)
    k.save_key(privfile, cipher=None) 
    k.save_pub_key(pubfile)
    
    return k

  def generate_key_msg(self, aeskey, publickeys):
    pass
  
  def encrypt(self, filepath_to_encrypt):
    """
    filepath_to_encrypt - full path to the file that we want to encrypt
    
    Returns (aeskey, aeskey(file).
    """
    
    # generate random AES-256 (symmetric key) password. Put in file.
    file_to_encrypt = self._hash_flatten_filepath(filepath_to_encrypt)
    log.info("Encrypting: %s --> %s", filepath_to_encrypt, file_to_encrypt)
    
    aes_key = M2Crypto.Rand.rand_bytes(32)
    salt = M2Crypto.Rand.rand_bytes(8)
    iv = '\0' * 32
    
    input = open(filepath_to_encrypt, 'r')
    output = open(file_to_encrypt + '.enc', 'w')
        
    cipher = M2Crypto.EVP.Cipher(alg='aes_256_cbc', key=aes_key, iv=iv, op=ENCODE, salt=salt)
    
    _filter_cipher(input, output, cipher)
    
    return aes_key, salt, file_to_encrypt + '.enc'

  def decrypt(self, file_to_decrypt, aes_key, salt):
    iv = '\0' * 32    
    input = open(file_to_decrypt, 'r')
    output = open(os.path.splitext(file_to_decrypt)[0], 'w')      
    cipher = M2Crypto.EVP.Cipher(alg='aes_256_cbc', key=aes_key, iv=iv, op=DECODE, salt=salt)    
    _filter_cipher(input, output, cipher)

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
    
    
def main():
  es = SSLHelper(os.path.expanduser('~/.safedepositbox/keys'))
  bundlename = es.bundle('DESIGN')
  # upload bundle
  filename = es.unbundle(bundlename)
  print filename

if __name__ == "__main__":
  main()
