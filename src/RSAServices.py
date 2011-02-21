#!/usr/bin/env python

import os
import subprocess

def encrypt(file_to_encrypt, public_key_filename):
    # generate random AES-256 (symmetric key) password. Put in file.
    password_filename = "file.password.txt"
    os.system("head -c 32 /dev/urandom | openssl enc -base64 > '%s'" % (password_filename))

    # encrypt file with symmetric key -> file.enc
    encrypted_filename = file_to_encrypt+".enc"
    os.system("openssl enc -aes-256-cbc -salt -in '%s' -out '%s' -pass file:'%s'" % (file_to_encrypt, encrypted_filename, password_filename))

    # encrypt key file with public key -> key.enc
    encrypted_password_file = password_filename+".enc"
    os.system("openssl rsautl -in '%s' -inkey '%s' -pubin -encrypt -pkcs -out '%s'" % (password_filename, public_key_filename, encrypted_password_file))

    return (encrypted_filename, encrypted_password_file)

def decrypt(file_to_decrypt, encrypted_password_file, private_key_filename):
    # decrypt key file with private key
    decrypted_password_filename = 'password.txt.dec'
    os.system("openssl rsautl -in '%s' -inkey '%s' -decrypt -pkcs -out '%s'" % (encrypted_password_file, private_key_filename, decrypted_password_filename))
    
    # decrypt file with symmetric key -> file
    decrypted_filename = file_to_decrypt+".dec"
    os.system("openssl enc -d -aes-256-cbc -in '%s' -pass file:'%s' -out '%s'" % (file_to_decrypt, decrypted_password_filename, decrypted_filename))

class RSAService:
    def __init__(self, display_name, display_location):
        self.display_name = display_name
        self.display_location = display_location

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

    encrypted_filename, encrypted_password_file = encrypt('DESIGN',filename_pub_pem_key)
    decrypt(encrypted_filename, encrypted_password_file, filename_priv_pem_key)

if __name__=="__main__":
    main()
