#!/usr/bin/env python

import os
import stat

for root, dirs, files in os.walk(os.path.expanduser("~/Dropbox/GoodReader")):
    st = os.stat(root)
    print os.path.isdir(root), st.st_ino, st.st_mtime, root
    for fi in files:
        print "  ", fi
