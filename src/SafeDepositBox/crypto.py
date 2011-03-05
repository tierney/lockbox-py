#!/usr/bin/env python

import hashlib, os
from util import log, flags, execute, init_dir, remove_file
import unittest

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
  output.write(cipher.final())
  output.flush()

class CryptoHelper(object):
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
  
  def encrypt(self, fpin, fpout):
    '''
    Encrypt a file object using a randomly generate aes key.
    
    fpin - file object containing the data to encrypt
    fpout - file object to write encrypted data to
    
    returns: aeskey, salt used for encryption.
'''
    log.info("Encrypting...")
    
    aes_key = M2Crypto.Rand.rand_bytes(32)
    salt = M2Crypto.Rand.rand_bytes(8)
    iv = '\0' * 32
    
    cipher = M2Crypto.EVP.Cipher(alg='aes_256_cbc', key=aes_key, iv=iv, op=ENCODE, salt=salt)
    
    _filter_cipher(fpin, fpout, cipher)
    
    log.info("Done...")    
    return aes_key, salt

  def decrypt(self, fpin, fpout, aes_key, salt):
    '''
    Decrypt a fileobject using the given AES key and salt.
    
'''

    iv = '\0' * 32
    cipher = M2Crypto.EVP.Cipher(alg='aes_256_cbc', key=aes_key, iv=iv, op=DECODE, salt=salt)    
    _filter_cipher(fpin, fpout, cipher)


def test_crypto():
  import cStringIO
  
  es = CryptoHelper(os.path.expanduser('~/.safedepositbox/keys'))
  TEST_STR = '0123456789' * 100
  
  input = cStringIO.StringIO(TEST_STR)
  encrypt = cStringIO.StringIO()
  decrypt = cStringIO.StringIO()
  
  aes, salt = es.encrypt(input, encrypt)
  es.decrypt(cStringIO.StringIO(encrypt.getvalue()), decrypt, aes, salt)
  
  assert TEST_STR == decrypt.getvalue()