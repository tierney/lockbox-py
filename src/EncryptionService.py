#!/usr/bin/env python
import os
import subprocess
from S3BucketPolicy import string_to_dns

def execute(cmd):
    subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE,
                     stderr=subprocess.PIPE).communicate()

class EncryptionService:
    def __init__(self, display_name, location, admin_directory,
                 filename_pub_pem_key=None, filename_priv_pem_key=None):
        self.display_name = display_name
        self.location = location
        self.admin_directory = admin_directory
        if (None == filename_pub_pem_key):
            pub_pem_key = "%s.%s.public.pem" % (self.display_name, self.location)
            filename_pub_pem_key = os.path.join(self.admin_directory, pub_pem_key)
            self.filename_priv_pem_key = filename_pub_pem_key
        if (None == filename_priv_pem_key):
            priv_pem_key = "%s.%s.private.pem" % (self.display_name, self.location)
            filename_priv_pem_key = os.path.join(self.admin_directory, priv_pem_key)
            self.filename_pub_pem_key = filename_priv_pem_key
        
    def set_pki_keys(self, filename_pub_pem_key, filename_priv_pem_key):
        # Expects absolute paths
        self.filename_pub_pem_key = filename_pub_pem_key
        self.filename_priv_pem_key = filename_priv_pem_key

    def generate_pki_keys(self):
        if not os.path.exists(self.admin_directory):
            os.mkdir(self.admin_directory)
            
        pub_pem_key = "%s.%s.public.pem" % (self.display_name, self.location)
        filename_pub_pem_key = os.path.join(self.admin_directory, pub_pem_key)
        priv_pem_key = "%s.%s.private.pem" % (self.display_name, self.location)
        filename_priv_pem_key = os.path.join(self.admin_directory, priv_pem_key)

        if os.path.exists(filename_pub_pem_key): os.remove(filename_pub_pem_key)
        if os.path.exists(filename_priv_pem_key): os.remove(filename_priv_pem_key)

        priv_key_cmd = "openssl genrsa -out '%s' 2048" % (filename_priv_pem_key)
        pub_key_cmd = "openssl rsa -in '%s' -pubout -out '%s'" % (filename_priv_pem_key,
                                                                  filename_pub_pem_key)
        # Quietly generate the private and public keys
        execute(priv_key_cmd)
        execute(pub_key_cmd)
        self.set_pki_keys(filename_pub_pem_key, filename_priv_pem_key)

    def encrypt(self, file_to_encrypt):
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
                (password_filename, self.filename_pub_pem_key, encrypted_password_file))
        execute("rm -f %s" % password_filename)
        return (encrypted_filename, encrypted_password_file)

    def decrypt(self, file_to_decrypt, encrypted_password_file):
        # decrypt key file with private key
        decrypted_password_filename = encrypted_password_file.rstrip('.enc')
        execute("openssl rsautl -in '%s' -inkey '%s' -decrypt -pkcs -out '%s'" %
                (encrypted_password_file, self.filename_pub_pem_key,
                 decrypted_password_filename))
        # decrypt file with symmetric key -> file
        decrypted_filename = file_to_decrypt.rstrip('.enc')
        execute("openssl enc -d -aes-256-cbc -in '%s' -pass file:'%s' -out '%s'" %
                (file_to_decrypt, decrypted_password_filename, decrypted_filename))
        execute("rm -f %s %s %s" % (encrypted_password_file, file_to_decrypt,
                                    decrypted_password_filename))

    def bundle(self, filename):
        encrypted_filename, encrypted_password_file = self.encrypt(filename)
        # combine the encrypted_filename and encrypted_password_file into
        # filename.displayname_location
        execute("rm -f %s.%s_%s" % (filename, self.display_name, self.location))
        execute("tar cjf %s.%s_%s %s %s" % (filename, self.display_name,
                                            self.location, encrypted_filename,
                                            encrypted_password_file))
        # print encrypted_filename, encrypted_password_file
        # Clean-up (upload to the cloud and then clean-up)
        execute("rm -f %s %s" % (encrypted_filename, 
                                 encrypted_password_file))
        # execute("rm -f %s.%s_%s" % (filename, self.display_name, self.location))
        return "%s.%s_%s" % (filename, self.display_name, self.location)

    def unbundle(self, bundle_filename):
        execute("tar xf %s" % bundle_filename)
        filename = "".join(bundle_filename.split('.')[:-1])
        file_to_decrypt = filename + ".enc"
        encrypted_password_file = filename + ".aes256.enc"
        self.decrypt(file_to_decrypt, encrypted_password_file)
        execute("rm -f %s" % bundle_filename)
        return filename

def main():
    display_name = "John Smith"
    location = "iMac"

    display_name = string_to_dns(display_name)
    display_location = string_to_dns(location)
    admin_directory = os.path.join(os.environ['HOME'], ".safedepositbox")

    es = EncryptionService(display_name, display_location, admin_directory)
    es.generate_pki_keys()
    bundlename = es.bundle('DESIGN')
    # upload bundle
    filename = es.unbundle(bundlename)
    print filename
    
if __name__=="__main__":
    main()
