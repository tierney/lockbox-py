#!/usr/bin/env python

import os, sys
import stat

known_files = dict()
# file -> (updated?, mtime)

def reset_known_files():
    for f in known_files:
        known_files[f][0] = 0
    
# if file is in the dict, then check if it is up to date.
#    if needs updating, then SIGN_AND_UPLOAD
# if a file is new, then mark as NEW
# if a file was in dict but NOTFOUND, then we want to REMOVE it.

def walktree(top, callback):
    '''recursively descend the directory tree rooted at top,
       calling the callback function for each regular file'''

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

def main():

    # figure out who's new and who's updated
    walktree('.',print_mtime)

    # see if anyone needs removing
    
if __name__ == '__main__':
    main()
