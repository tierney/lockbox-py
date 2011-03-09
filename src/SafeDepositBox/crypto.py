#!/usr/bin/env python

import os
from util import log, init_dir

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
    self._initialize_keys()

  def _remove_priv_pem_headers(self, priv):
    pub.replace("-----BEGIN PUBLIC KEY-----\n","")
    pub.replace("-----END PUBLIC KEY-----\n","")
    return priv

  def _remove_pub_pem_headers(self, pub):
    pub = pub.replace("-----BEGIN PUBLIC KEY-----\n","")
    pub = pub.replace("-----END PUBLIC KEY-----\n","")
    return pub

  def _initialize_keys(self):
    init_dir(self.key_dir)
    priv = os.path.join(self.key_dir, 'sdb.private')
    pub = os.path.join(self.key_dir, 'sdb.public')
    
    try:
      self.priv_key = M2Crypto.RSA.load_key(priv)
      M2Crypto.RSA.load_pub_key(pub)
    except:
      log.warn('Failed to load keys.  Regenerating...')
      self.priv_key, self.pub_key = self._generate_pki_keys(priv, pub)
    
  def _generate_pki_keys(self, privfile, pubfile):
    k = M2Crypto.RSA.gen_key(2048, 11)
    k.save_key(privfile, cipher=None) 
    k.save_pub_key(pubfile)

    priv = M2Crypto.RSA.load_key(privfile)
    pub = M2Crypto.RSA.load_pub_key(pubfile)

    print """INSERT INTO config (key, value) VALUES ("private_key",%s)""" % priv.as_pem(cipher=None)
    print """INSERT INTO config (key, value) VALUES ("public_key",%s)""" % self._remove_pub_pem_headers(pub.as_pem())
    # Store these in the config table of the database
    # INSERT INTO config (key, value) VALUES (public_key, 
    return priv, pub

  def generate_aes_key(self):
    '''Generate and return new random AES key.'''
    return M2Crypto.Rand.rand_bytes(32)
  
  def encrypt_aes_key(self, aes):
    log.info("Encrypting AES key")
    return self.pub_key.public_encrypt(aes, M2Crypto.RSA.pkcs1_padding)
  
  def decrypt_aes_key(self, aes_enc):
    log.info("Decrypting AES key")
    return self.priv_key.private_decrypt(aes_enc, M2Crypto.RSA.pkcs1_padding)
      
  def encrypt(self, fpin, fpout, aes_key=None):
    '''
    Encrypt a file object using a aes key.
    
    fpin - file object containing the data to encrypt
    fpout - file object to write encrypted data to
    
    If no key is specified, a random key will be generated.
    
    returns: aes_key, salt used for encryption.
'''
    log.info("Encrypting file...")
    
    if not aes_key:
      aes_key = M2Crypto.Rand.rand_bytes(32)
    salt = M2Crypto.Rand.rand_bytes(8)
    iv = '\0' * 32
    
    cipher = M2Crypto.EVP.Cipher(alg='aes_256_cbc', key=aes_key, iv=iv, op=ENCODE, salt=salt)
    
    _filter_cipher(fpin, fpout, cipher)
    
    log.info("Done.")    
    return aes_key, salt

  def decrypt(self, fpin, fpout, aes_key, salt):
    '''
    Decrypt a fileobject using the given AES key and salt.
    
'''
    log.info("Decrypting file...")
    iv = '\0' * 32
    cipher = M2Crypto.EVP.Cipher(alg='aes_256_cbc', key=aes_key, iv=iv, op=DECODE, salt=salt)    
    _filter_cipher(fpin, fpout, cipher)
    log.info("Done")

def test_crypto():
  import cStringIO
  
  es = CryptoHelper(os.path.expanduser('~/.safedepositbox/keys'))
  TEST_STR = '0123456789' * 100
  
  input = cStringIO.StringIO(TEST_STR)
  encrypt = cStringIO.StringIO()
  decrypt = cStringIO.StringIO()
  
  aes, salt = es.encrypt(input, encrypt)
  eaes = es.encrypt_aes_key(aes)

  es.decrypt_aes_key(eaes)
  es.decrypt(cStringIO.StringIO(encrypt.getvalue()), decrypt, aes, salt)
  
  assert TEST_STR == decrypt.getvalue()

if __name__=="__main__":
  test_crypto()
