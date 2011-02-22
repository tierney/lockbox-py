#!/usr/bin/env python

import os
import subprocess

def execute(cmd):
    subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE,
                     stderr=subprocess.PIPE).communicate()

def encrypt(file_to_encrypt, public_key_filename):
    # generate random AES-256 (symmetric key) password. Put in file.
    password_filename = "%s.aes256" % file_to_encrypt
    execute("head -c 128 /dev/urandom | openssl enc -base64 > '%s'" %
            (password_filename))

    # encrypt file with symmetric key -> file.enc
    encrypted_filename = file_to_encrypt+".enc"
    execute("openssl enc -aes-256-cbc -salt -in '%s' -out '%s' -pass file:'%s'" %
            (file_to_encrypt, encrypted_filename, password_filename))

    # encrypt key file with public key -> key.enc
    encrypted_password_file = password_filename+".enc"
    execute("openssl rsautl -in '%s' -inkey '%s' -pubin -encrypt -pkcs -out '%s'" %
            (password_filename, public_key_filename, encrypted_password_file))

    execute("rm -f %s" % password_filename)

    return (encrypted_filename, encrypted_password_file)

def decrypt(file_to_decrypt, encrypted_password_file, private_key_filename):
    # decrypt key file with private key
    decrypted_password_filename = encrypted_password_file.rstrip('.enc')
    execute("openssl rsautl -in '%s' -inkey '%s' -decrypt -pkcs -out '%s'" %
            (encrypted_password_file, private_key_filename, decrypted_password_filename))
    
    # decrypt file with symmetric key -> file
    decrypted_filename = file_to_decrypt.rstrip('.enc')
    execute("openssl enc -d -aes-256-cbc -in '%s' -pass file:'%s' -out '%s'" %
            (file_to_decrypt, decrypted_password_filename, decrypted_filename))

    execute("rm -f %s %s %s" % (encrypted_password_file, file_to_decrypt,
                                decrypted_password_filename))

class RSAService:
    def __init__(self, display_name, display_location):
        self.display_name = display_name
        self.display_location = display_location

def generate_pki_keys(display_name, display_location):
    filename_priv_pem_key = "%s.%s.private.pem" % (display_name, display_location)
    filename_pub_pem_key = "%s.%s.public.pem" % (display_name, display_location)

    if os.path.exists(filename_priv_pem_key):
        os.remove(filename_priv_pem_key)
    if os.path.exists(filename_pub_pem_key):
        os.remove(filename_pub_pem_key)
    
    priv_key_cmd = "openssl genrsa -out '%s' 2048" % (filename_priv_pem_key)
    pub_key_cmd = "openssl rsa -in '%s' -pubout -out '%s'" % (filename_priv_pem_key,
                                                              filename_pub_pem_key)
    # Quietly generate the private and public keys
    execute(priv_key_cmd)
    execute(pub_key_cmd)
    
    return (filename_priv_pem_key, filename_pub_pem_key)

def bundle(display_name, location, filename, pub_key):
    encrypted_filename, encrypted_password_file =\
        encrypt(filename, pub_key)

    # combine the encrypted_filename and encrypted_password_file into
    # filename.displayname_location
    execute("rm -f %s.%s_%s" % (filename, display_name, location))

    execute("tar cjf %s.%s_%s %s %s" % 
            (filename, display_name, location, 
             encrypted_filename, encrypted_password_file))

    print encrypted_filename, encrypted_password_file
    # Clean-up (upload to the cloud and then clean-up)
    execute("rm -f %s %s" % (encrypted_filename, 
                             encrypted_password_file))
    # execute("rm -f %s.%s_%s" % (filename, display_name, location))
    return "%s.%s_%s" % (filename, display_name, location)

def unbundle(bundle_filename, priv_key):
    execute("tar xf %s" % bundle_filename)
    filename                = "".join(bundle_filename.split('.')[:-1])
    file_to_decrypt         = filename + ".enc"
    encrypted_password_file = filename + ".aes256.enc"
    decrypt(file_to_decrypt, encrypted_password_file, priv_key)
    execute("rm -f %s" % bundle_filename)
    return filename

def main():
    display_name = "John Smith"
    display_location = "iMac"

    from S3BucketPolicy import string_to_dns
    display_name = string_to_dns(display_name)
    display_location = string_to_dns(display_location)

    filename_priv_pem_key, filename_pub_pem_key =\
                           generate_pki_keys(display_name, display_location)

    bundlename = bundle(display_name, display_location, 
                        'DESIGN', filename_pub_pem_key)
    # upload bundle

    filename = unbundle(bundlename, filename_priv_pem_key)

if __name__=="__main__":
    main()
