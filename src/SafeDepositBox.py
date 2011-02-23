#!/usr/bin/env python

import ConfigParser
import logging
import os
import stat
import sys
import time
from threading import Thread
from S3BucketPolicy import string_to_dns
from EncryptionService import EncryptionService
from S3Sandbox import S3Bucket
from util import execute

class SafeDepositBox(Thread):
    def __init__(self, sdb_directory, admin_directory,
                 display_name, location, debug=False):
        Thread.__init__(self)
        self.admin_directory = admin_directory
        self.sdb_directory = sdb_directory
        self.prefix_to_ignore = os.path.split(os.path.abspath(self.sdb_directory))[0]+"/"
        self.display_name = display_name
        self.location = location

        self.STATUS = 0
        self.MTIME  = 1

        self.NOT_VISITED = 0
        self.UNCHANGED   = 1
        self.UPDATED     = 2

        self.known_files = dict() # file -> [updated?, file's mtime]
        self.IDLE_WINDOW = 1 # sec

        self.debug = debug

    def init(self):
        if self.debug:
            log_filename = os.path.join(self.admin_directory, 'sdb.log')
            logging.basicConfig(level = logging.DEBUG,
                                format = "%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(lineno)d - %(funcName)s - %(message)s",
                                filename = log_filename,
                                filemode='a')
            # handler = logging.handlers.RotatingFileHandler(log_filename,
            #                                                maxBytes=1048576,
            #                                                backupCount=10)

            # self.sdb_logger.addHandler(handler)
            
    def init_encryption_service(self):
        self.enc_service = EncryptionService(self.display_name,
                                             self.location,
                                             self.admin_directory,
                                             use_default_location=True)
    def init_s3bucket(self):
        config = ConfigParser.ConfigParser()
        sysname = os.uname()[0]
        if ('Linux' == sysname):
            config.read("/home/tierney/conf/aws.cfg")
        elif ('Darwin' == sysname):
            config.read("/Users/tierney/conf/aws.cfg")
        else:
            sys.exit(1)
        aws_access_key_id = config.get('aws','access_key_id')
        aws_secret_access_key = config.get('aws','secret_access_key')
    
        self.s3bucket = S3Bucket(self.display_name, self.location, 'testfiles.sdb',
                                 aws_access_key_id, aws_secret_access_key)
        self.s3bucket.init()
        
    def upload_file(self, filename):
        # Should queue this operation.
        #
        # bundle(encrypt) the file
        bundle_filename = self.enc_service.bundle(filename)
        # send the file
        file_key = bundle_filename.replace(self.prefix_to_ignore,'',1)
        self.s3bucket.send_filename(file_key, bundle_filename)
        # Cleanup
        execute("rm -f %s" % bundle_filename)
        
    def download_file(self, filename):
        # get file...
        self.enc_service.unbundle(filename)
        
    def reset_known_files(self):
        for filename in self.known_files:
            self.known_files[filename][self.STATUS] = self.NOT_VISITED

    def upload_updated_files(self):
        pass

    def delete_not_visited_files(self):
        delete_list = []
        for filename in self.known_files:
            if (self.NOT_VISITED == self.known_files[filename][self.STATUS]):
                # k = b.s3.key.Key(b, filename)
                # k.delete()
                print "Removing", filename
                delete_list.append(filename)
        for filename in delete_list:
            del self.known_files[filename]

    def bad_file(self, filename):
        extension = filename.split('.')[-1]
        if ('swp' == extension):
            return True
        if '#' in filename:
            return True
        return False
    def walktree(self, top, callback):
        '''recursively descend the directory tree rooted at top,
           calling the callback function for each regular file'''
        top = os.path.abspath(top)
        for filename in os.listdir(top):
            if self.bad_file(filename):
                #self.sdb_logger.debug("Badfile: %s" % filename)
                logging.debug("Badfile: %s" % filename)
                continue
            pathname = os.path.join(top, filename)
            try:
                mode = os.stat(pathname)[stat.ST_MODE]
            except OSError, e:
                # means the file isn't there anymore
                # market file for deletion
                print e
                continue
            if stat.S_ISDIR(mode):
                # It's a directory, recurse into it
                self.walktree(pathname, callback)
            elif stat.S_ISREG(mode):
                # It's a file, call the callback function
                callback(pathname)
            else:
                # Unknown file type, print a message
                print 'Skipping %s' % pathname

    def mod_files(self, filename):
        filename_mtime = os.stat(filename).st_mtime
        if filename in self.known_files:
            if (self.known_files[filename][self.MTIME] < filename_mtime):
                self.known_files[filename][self.STATUS] = self.UPDATED
                self.known_files[filename][self.MTIME] = filename_mtime
                print "Should encrypt and upload", filename
                self.upload_file(filename)
            else:
                self.known_files[filename][self.STATUS] = self.UNCHANGED
        else:
            self.known_files[filename] = [self.UPDATED, filename_mtime]
            print "Check if file is already uploaded as current version", filename, filename_mtime

    def run(self):
        while True:
            # figure out who's new and who's updated
            self.walktree(self.sdb_directory, self.mod_files)
            
            # see if anyone needs removing
            # print self.known_files
            # uploaded_updated_files()
            self.delete_not_visited_files()
            self.reset_known_files()

            time.sleep(self.IDLE_WINDOW)
    
if __name__ == '__main__':
    display_name = "John Smith"
    display_location = "iMac"

    display_name = string_to_dns(display_name)
    display_location = string_to_dns(display_location)

    sdb_directory = "../test/data"
    admin_directory = os.path.join(os.environ['HOME'],
                                   ".safedepositbox")
    s = SafeDepositBox(sdb_directory, admin_directory,
                       display_name, display_location, debug=True)
    s.init()
    s.init_encryption_service()
    s.init_s3bucket()
    # s.upload_file('DESIGN')

    # s.daemon = True
    s.start()
