#!/usr/bin/env python

import os
import base64
import hashlib
import zlib
import time

BLOCK_SIZE = 4194304 # bytes (4 MB)

def time_compression(data, lib, level):
    start = time.time()
    out = lib.compress(data, level)
    finish = time.time()
    print lib.__name__, level, (finish - start), float(len(out)) / len(data)

f = open(os.path.expanduser("~/Dropbox/bigfile.txt"))
s = f.read(BLOCK_SIZE)
# for lib in [zlib, bz2]:
#     for level in range(1,10):
#         time_compression(s, lib, level)

zc = zlib.compress(s,1)
print zc
print len(zc)

#print len(bz2.compress(s,7))
print len(s)
print len(base64.encodestring(s))
print hashlib.md5(s).hexdigest()
