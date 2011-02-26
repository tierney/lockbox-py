#!/usr/bin/env python
import calendar
import ConfigParser
import logging
import os
import stat
import sys
import time
from threading import Thread, Lock
from S3BucketPolicy import string_to_dns
from EncryptionService import EncryptionService
from S3Interface import S3Bucket
from util import execute
from constants import *

class SafeDepositBox(Thread):
    def __init__(self, sdb_directory, admin_directory,
                 display_name, location, debug=False):
        Thread.__init__(self)

        self.sdb_directory = sdb_directory

        # What if we fail to create the admin directory... but have
        # logged this information nowhere?
        self.admin_directory = admin_directory
        if not os.path.exists(self.admin_directory):
            os.mkdir(self.admin_directory)
        
        if debug:
            log_filename = os.path.join(self.admin_directory, 'sdb.log')
            logging.basicConfig(level = logging.DEBUG,
                                format = "%(asctime)s - %(name)s - %(levelname)s" \
                                "- %(module)s:%(lineno)d - %(funcName)s - %(message)s",
                                filename = log_filename,
                                filemode='wa')
        

        self.prefix_to_ignore = os.path.abspath(self.sdb_directory)+"/"
        self.display_name = display_name
        self.location = location
        
        self.known_files = dict() # file -> [updated?, file's mtime]
        self.known_files_lock = Lock()
        self.known_files_locks = dict()

        self.enc_service = EncryptionService(self.display_name,
                                             self.location,
                                             self.admin_directory,
                                             self.prefix_to_ignore,
                                             use_default_location=True)
        self.staging_directory = os.path.join(self.admin_directory, 'staging')
        
        config = ConfigParser.ConfigParser()
        sysname = os.uname()[0]
        if ('Linux' == sysname): 
            config.read("/home/tierney/conf/aws.cfg")
        elif ('Darwin' == sysname):
            config.read("/Users/tierney/conf/aws.cfg")
        else: sys.exit(1)

        aws_access_key_id = config.get('aws','access_key_id')
        aws_secret_access_key = config.get('aws','secret_access_key')
    
        self.s3bucket = S3Bucket(self.display_name, self.location, 'testfiles.sdb',
                                 self.staging_directory,
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

    # def delete_not_visited_files(self):
    #     delete_list = []
    #     for filename in self.known_files:
    #         if (self.NOT_VISITED == self.known_files[filename][self.STATUS]):
    #             # k = b.s3.key.Key(b, filename)
    #             # k.delete()
    #             print "Removing", filename
    #             delete_list.append(filename)
    #     for filename in delete_list:
    #         del self.known_files[filename]

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

    def _lm_to_epoch(self, last_modified_time):
        return calendar.timegm(time.strptime(last_modified_time.replace("Z",''), u"%Y-%m-%dT%H:%M:%S.000"))

    def monitor_local_file(self, filename):
        # Check for local file changes (make some queue of these results)
        filename_mtime = os.stat(filename).st_mtime
        if filename in self.known_files:
            self.known_files[filename][LOCK].acquire()
            if (self.known_files[filename][MTIME] < filename_mtime):
                self.known_files[filename][STATUS] = UPDATED
                self.known_files[filename][MTIME] = filename_mtime
                self.s3bucket.enqueue(filename, UPDATED)
            else:
                self.known_files[filename][STATUS] = UNCHANGED
            self.known_files[filename][LOCK].release()
        else: # don't have this file information stored in memory
            self.known_files[filename] = [PNEW, filename_mtime, Lock()]
            self.s3bucket.enqueue(filename, PNEW)
#             print "Check if file is already uploaded as current version", \
#                 self.known_files[filename]

    def monitor_cloud_files(self):
        keys = self.s3bucket.get_all_keys()
        # make sure that we update our known_files table view of the
        # file time so that we don't continue to update
        for key in keys:
            print "CLOUD:", self.prefix_to_ignore, key.name, self._lm_to_epoch(key.last_modified)
            
    def sync_files_thread(self):
        # Do I want to handle here pulling files from the cloud?
        #
        # delete not visited files
        while True:
            keys = self.s3bucket.get_all_keys()
            print keys
            for filename in self.known_files:
                self.known_files[filename][self.LOCK].acquire()                
                fpath = os.path.join(self.sdb_directory, filename)
                if not os.path.exists(fpath):
                    delete_list.append(filename)

                filename_mtime = time.gmtime(os.stat(filename).st_mtime)
                if (self.PNEW == self.known_files[filename][self.STATUS]):
                    if (filename not in keys):
                        # upload
                        self.upload_file(filename)
                        self.known_files[filename][self.STATUS] = self.UPDATED
                        self.known_files[filename][self.MTIME] = filename_mtime
                    else:
                        key = keys.get(filename)
                        mtime = key.last_modified
                        key_mtime = time.strptime(mtime.replace("Z",''),
                                                  u"%Y-%m-%dT%H:%M:%S.000")
                        print key.md5sum
                        assert(key.md5sum != None)
                        
                        with open(filename) as fp:
                            local_md5 = self.s3bucket.compute_md5(fp)[0]
                            
                        if (key.md5) != (local_md5):
                            if (key_mtime > filename_mtime):
                                self.download_file(filename)
                            elif (key_mtime < filename_mtime):
                                self.upload_file(filename)
                elif ():
                    pass
                
                self.known_files[filename][self.LOCK].release()

        # maybe we want to store that the file's state is deleted
        # locally but keep the key in the cloud?

        # reset file when update
        pass

    def run(self):
        while True:
            # figure out who's new and who's updated
            self.walktree(self.sdb_directory, self.monitor_local_file)
            
            # see if anyone needs removing
            print time.time()
            for f in self.known_files:
                print " ", f, self.known_files.get(f)

            self.monitor_cloud_files()
            
            # uploaded_updated_files()
            # self.delete_not_visited_files()
            # self.reset_known_files()

            time.sleep(IDLE_WINDOW)
    
if __name__ == '__main__':

    display_name = string_to_dns("John Smith")
    display_location = string_to_dns("Bronx iMac")

    sdb_directory = os.path.join(os.environ['HOME'], 
                                 "src/safe-deposit-box/test/data")

    admin_directory = os.path.join(os.environ['HOME'],
                                   ".safedepositbox")
    s = SafeDepositBox(sdb_directory, admin_directory,
                       display_name, display_location, debug=True)

    Thread(target=s.s3bucket.proc_queue, args=(s.prefix_to_ignore, s.enc_service)).start()
    s.start()

