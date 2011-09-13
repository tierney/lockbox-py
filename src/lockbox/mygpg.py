#!/usr/bin/env python

import logging

logging.basicConfig(filename="mygpg.log",level=logging.DEBUG)
logging.warning("Testing.")
logging.debug("Hello")

import gnupg
import tempfile
import os

gpg = gnupg.GPG(use_agent=True)

fprint = ''
for key in gpg.list_keys():
    for uid in key.get('uids'):
        if "Matt Tierney" in uid:
            fprint = key.get('fingerprint')

print "My fingerprint:", fprint

encfno, encfname = tempfile.mkstemp()
os.close(encfno)

# myfile = gnupg._make_binary_stream("Hello world", gpg.encoding)

myfile = open("helloworld.txt",'rb')
recipients = (fprint,)

enc = gpg.encrypt_file(myfile, recipients,
                       sign=fprint,
                       always_trust=True,
                       passphrase=True,
                       armor=True,
                       output=encfname)
myfile.close()

decfno, decfname = tempfile.mkstemp()
os.close(encfno)

encfile = open(encfname,'rb')
gpg.decrypt_file(encfile, always_trust=True, passphrase=True, output=decfname)
encfile.close()
print "Encrypted:", encfname
print "Decrypted:", decfname

def test_file_encryption_and_decryption():
    "Test that encryption/decryption to/from file works"
    logger.debug("test_file_encryption_and_decryption begins")
    encfno, encfname = tempfile.mkstemp()
    decfno, decfname = tempfile.mkstemp()
    # On Windows, if the handles aren't closed, the files can't be deleted
    os.close(encfno)
    os.close(decfno)
    logger.debug('Encrypting to: %r', encfname)
    logger.debug('Decrypting to: %r', decfname)
    try:
        data = "Hello, world!"
        file = gnupg._make_binary_stream(data, gpg.encoding)
        edata = self.gpg.encrypt_file(file,
                                      fprint,
                                      armor=False, output=encfname)
        efile = open(encfname, 'rb')
        ddata = self.gpg.decrypt_file(efile, passphrase="bbrown",
                                      output=decfname)
        efile.seek(0, 0) # can't use os.SEEK_SET in 2.4
        edata = efile.read()
        efile.close()
        dfile = open(decfname, 'rb')
        ddata = dfile.read()
        dfile.close()
        data = data.encode(self.gpg.encoding)
        if ddata != data:
            logger.debug("was: %r", data)
            logger.debug("new: %r", ddata)
        self.assertEqual(data, ddata, "Round-trip must work")
    finally:
        for fn in (encfname, decfname):
            if os.path.exists(fn):
                os.remove(fn)
    logger.debug("test_file_encryption_and_decryption ends")

