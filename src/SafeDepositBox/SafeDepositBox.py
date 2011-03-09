#!/usr/bin/env python
import calendar
import logging
import os
import stat
import time
from threading import Thread, Lock
from crypto import CryptoHelper
from S3Interface import S3Connection
from SDBSQLiteHelper import SDBSQLiteHelper as SQL
from util import execute
import constants as C

class SafeDepositBox(Thread):
    def __init__(self):
        Thread.__init__(self)
        self.admin_directory = os.path.expanduser("~/.safedepositbox")
        
        self.db = SQL(os.path.expanduser("~/.safedepositbox"))
        config = self.db.get_config()

        # Should be apart of init process..
        self.sdb_directory = os.path.expanduser(config.get('sdb_directory'))
        if not os.path.exists(self.sdb_directory):
            os.mkdir(self.sdb_directory)
        elif not os.path.isdir(self.sdb_directory):
            os.remove(self.sdb_directory)
            os.mkdir(self.sdb_directory)

        # file -> [updated?, file's mtime]
        self.known_files = dict() 
        self.known_files_lock = Lock()
        self.known_files_locks = dict()

        self.crypto_helper = CryptoHelper(os.path.expanduser('~/.safedepositbox/keys'))        

        config['staging_directory'] = os.path.join(self.admin_directory, 'staging')
        config['bucket_name'] = 'safe-deposit-box'
        
        self.S3Conn = S3Connection(config, prefix='/data')

    def upload_file(self, filename):
        # Should queue this operation.
        #
        # bundle(encrypt) the file
        bundle_filename = self.crypto_helper.bundle(filename)
        # send the file
        file_key = bundle_filename.replace(self.prefix_to_ignore,'',1)
        self.S3Conn.send_filename(file_key, bundle_filename)
        # Cleanup
        execute("rm -f %s" % bundle_filename)
        
    def download_file(self, filename):
        # get file...
        self.crypto_helper.unbundle(filename)
        
    def reset_known_files(self):
        for filename in self.known_files:
            self.known_files[filename][C.STATUS] = C.NOT_VISITED

    def upload_updated_files(self):
        pass

    def _bad_file(self, filename):
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
            if self._bad_file(filename):
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
            self.known_files[filename][C.LOCK].acquire()
            if (self.known_files[filename][C.MTIME] < filename_mtime):
                self.known_files[filename][C.STATUS] = C.UPDATED
                self.known_files[filename][C.MTIME] = filename_mtime
                self.S3Conn.enqueue(filename, C.UPDATED)
            else:
                self.known_files[filename][C.STATUS] = C.UNCHANGED
            self.known_files[filename][C.LOCK].release()
        else: # don't have this file information stored in memory
            self.known_files[filename] = [C.PNEW, filename_mtime, Lock()]
            self.S3Conn.enqueue(filename, C.PNEW)
#             print "Check if file is already uploaded as current version", \
#                 self.known_files[filename]

    def monitor_cloud_files(self):
        keys = self.S3Conn.get_all_keys()
        # make sure that we update our known_files table view of the
        # file time so that we don't continue to update
        for key in keys:
            print "CLOUD:", self.prefix_to_ignore, key.name, self._lm_to_epoch(key.last_modified)
            
    def sync_files_thread(self):
        # Do I want to handle here pulling files from the cloud?
        #
        # delete not visited files
        while True:
            keys = self.S3Conn.get_all_keys()
            print keys
            for filename in self.known_files:
                self.known_files[filename][C.LOCK].acquire()                
                fpath = os.path.join(self.sdb_directory, filename)
                if not os.path.exists(fpath):
                    delete_list.append(filename)

                filename_mtime = time.gmtime(os.stat(filename).st_mtime)
                if (C.PNEW == self.known_files[filename][C.STATUS]):
                    if (filename not in keys):
                        # upload
                        self.upload_file(filename)
                        self.known_files[filename][C.STATUS] = C.UPDATED
                        self.known_files[filename][C.MTIME] = filename_mtime
                    else:
                        key = keys.get(filename)
                        mtime = key.last_modified
                        key_mtime = time.strptime(mtime.replace("Z",''),
                                                  u"%Y-%m-%dT%H:%M:%S.000")
                        print key.md5sum
                        assert(key.md5sum != None)
                        
                        with open(filename) as fp:
                            local_md5 = self.S3Conn.compute_md5(fp)[0]
                            
                        if (key.md5) != (local_md5):
                            if (key_mtime > filename_mtime):
                                self.download_file(filename)
                            elif (key_mtime < filename_mtime):
                                self.upload_file(filename)
                elif ():
                    pass
                
                self.known_files[filename][C.LOCK].release()

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

            time.sleep(C.IDLE_WINDOW)
    
if __name__ == '__main__':
    sdb = SafeDepositBox()
    Thread(target=sdb.S3Conn.proc_queue, args=(sdb.sdb_directory, sdb.crypto_helper)).start()
    sdb.start()
