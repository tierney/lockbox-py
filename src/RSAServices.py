#!/usr/bin/env python

import os
import subprocess
# svn co http://svn.osafoundation.org/m2crypto/tags/0.21.1 m2crypto-0.21.1
from M2Crypto import RSA

# easy_install rsa
#import rsa

def main():
    display_name = "John Smith"
    display_location = "iMac"

    # filename_priv_key = display_name+","+display_location+",key"
    # filename_pub_key = filename_priv_key+".pub"
    # keygen_cmd = "ssh-keygen -q -t rsa -f '%s' -C '%s@%s' -N ''" % (filename_priv_key, display_name, display_location)
    # print keygen_cmd
    # if os.path.exists(filename_priv_key):
    #     os.remove(filename_priv_key)
    # if os.path.exists(filename_pub_key):
    #     os.remove(filename_pub_key)
    # os.system(keygen_cmd)

    filename_priv_pem_key = "%s.%s.private.pem" % (display_name, display_location)
    filename_pub_pem_key = "%s.%s.public.pem" % (display_name, display_location)
    if os.path.exists(filename_priv_pem_key):
        os.remove(filename_priv_pem_key)
    if os.path.exists(filename_pub_pem_key):
        os.remove(filename_pub_pem_key)
    
    priv_key_cmd = "openssl genrsa -out '%s' 2048" % (filename_priv_pem_key)
    #print priv_key_cmd
    pub_key_cmd = "openssl rsa -in '%s' -pubout -out '%s'" % (filename_priv_pem_key, filename_pub_pem_key)
    #print pub_key_cmd
    # os.system(priv_key_cmd)
    # os.system(pub_key_cmd)

    # Quietly generate the private and public keys
    subprocess.Popen(priv_key_cmd, shell=True, stderr=subprocess.PIPE).communicate()
    subprocess.Popen(pub_key_cmd, shell=True, stderr=subprocess.PIPE).communicate()

    # pub_key = ""
    # with open(filename_pub_key) as fh:
    #     pub_key = fh.readlines()[0].split()[1]

    rsa = RSA.load_pub_key(filename_pub_pem_key)
    encrypted = rsa.public_encrypt("hello world", RSA.pkcs1_oaep_padding)
    print encrypted.encode('base64')

    # print pub_key
    # s = rsa.encrypt("hello world", pub_key)
    # print s
    
    # name, computer, key
    # filename_priv_key
if __name__=="__main__":
    main()
