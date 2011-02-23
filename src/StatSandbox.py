#!/usr/bin/env python

import os, sys
import stat
import time

IDLE_WINDOW = 1 # sec

known_files = dict()
# file -> [updated?, file's mtime]

STATUS = 0
MTIME = 1

NOT_VISITED = 0
UNCHANGED = 1
UPDATED = 2

def reset_known_files():
    for filename in known_files:
        known_files[filename][STATUS] = NOT_VISITED

def upload_updated_files():
    pass

def delete_not_visited_files():
    delete_list = []
    for filename in known_files:
        if (NOT_VISITED == known_files[filename][STATUS]):
            # k = b.s3.key.Key(b, filename)
            # k.delete()
            print "Removing", filename
            delete_list.append(filename)
    for filename in delete_list:
        del known_files[filename]

# if file is in the dict, then check if it is up to date.
#    if needs updating, then SIGN_AND_UPLOAD
# if a file is new, then mark as NEW
# if a file was in dict but NOTFOUND, then we want to REMOVE it.

def walktree(top, callback):
    '''recursively descend the directory tree rooted at top,
       calling the callback function for each regular file'''
    top = os.path.abspath(top)

    for f in os.listdir(top):
        pathname = os.path.join(top, f)
        mode = os.stat(pathname)[stat.ST_MODE]
        if stat.S_ISDIR(mode):
            # It's a directory, recurse into it
            walktree(pathname, callback)
        elif stat.S_ISREG(mode):
            # It's a file, call the callback function
            callback(pathname)
        else:
            # Unknown file type, print a message
            print 'Skipping %s' % pathname

def visitfile(file):
    print 'visiting', file

def walktree_test():
    walktree(sys.argv[1], visitfile)

def print_mtime(file):
    print file, os.stat(file).st_mtime

def mod_files(filename):
    filename_mtime = os.stat(filename).st_mtime
    if filename in known_files:
        if (known_files[filename][MTIME] < filename_mtime):
            known_files[filename][STATUS] = UPDATED
            known_files[filename][MTIME] = filename_mtime
            print "Should encrypt and upload", filename
        else:
            known_files[filename][STATUS] = UNCHANGED
    else:
        known_files[filename] = [UPDATED, filename_mtime]
    
def main():
    while True:
        # figure out who's new and who's updated
        walktree('../test/data', mod_files)

        # see if anyone needs removing
        print known_files
        # uploaded_updated_files()
        delete_not_visited_files()
        reset_known_files()
        
        time.sleep(IDLE_WINDOW)
    
if __name__ == '__main__':
    main()
