#!/usr/bin/env python

import os
import subprocess
# svn co http://svn.osafoundation.org/m2crypto/tags/0.21.1 m2crypto-0.21.1
from M2Crypto import RSA

# easy_install rsa
#import rsa
def encrypt(file_to_encrypt):
    # generate random AES-256 (symmetric key) password. Put in file.
    # head -c 32 /dev/urandom | openssl enc -base64 > file.password.txt

    # encrypt file with symmetric key -> file.enc
    # openssl enc -aes-256-cbc -a -salt -in file.txt -out file.enc -pass file:file.password.txt

    # encrypt key file with public key -> key.enc
    # openssl rsautl -in file.password.txt -inkey 'John Smith.iMac.public.pem' -pubin -encrypt -pkcs -out file.password.enc
    pass

def decrypt():
    # decrypt key file with private key
    # openssl rsautl -in file.password.enc -inkey 'John Smith.iMac.private.pem' -decrypt -pkcs -out file.password.dec
    
    # decrypt file with symmetric key -> file
    # openssl enc -d -aes-256-cbc -a -in file.enc -pass file:file.password.dec
    pass

class RSAService:
    def __init__(self, display_name, display_location):
        pass

    
def main():
    display_name = "John Smith"
    display_location = "iMac"

    filename_priv_pem_key = "%s.%s.private.pem" % (display_name, display_location)
    filename_pub_pem_key = "%s.%s.public.pem" % (display_name, display_location)
    if os.path.exists(filename_priv_pem_key):
        os.remove(filename_priv_pem_key)
    if os.path.exists(filename_pub_pem_key):
        os.remove(filename_pub_pem_key)
    
    priv_key_cmd = "openssl genrsa -out '%s' 2048" % (filename_priv_pem_key)
    pub_key_cmd = "openssl rsa -in '%s' -pubout -out '%s'" % (filename_priv_pem_key, filename_pub_pem_key)

    # Quietly generate the private and public keys
    subprocess.Popen(priv_key_cmd, shell=True, stderr=subprocess.PIPE).communicate()
    subprocess.Popen(pub_key_cmd, shell=True, stderr=subprocess.PIPE).communicate()

    rsa = RSA.load_pub_key(filename_pub_pem_key)
    message = "1"*214
    print len(message)
    encrypted = rsa.public_encrypt(message, RSA.pkcs1_oaep_padding)
    print encrypted.encode('base64')

    # print pub_key
    # s = rsa.encrypt("hello world", pub_key)
    # print s
    
    # name, computer, key
    # filename_priv_key
if __name__=="__main__":
    main()
