#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
This is a pure Python implementation of the [rsync algorithm](TM96).

[TM96] Andrew Tridgell and Paul Mackerras. The rsync algorithm.
Technical Report TR-CS-96-05, Canberra 0200 ACT, Australia, 1996.
http://samba.anu.edu.au/rsync/.

### Example Use Case: ###

    # On the system containing the file that needs to be patched
    >>> unpatched = open("unpatched.file", "rb")
    >>> hashes = blockchecksums(unpatched)

    # On the remote system after having received `hashes`
    >>> patchedfile = open("patched.file", "rb")
    >>> delta = rsyncdelta(patchedfile, hashes)

    # System with the unpatched file after receiving `delta`
    >>> unpatched.seek(0)
    >>> save_to = open("locally-patched.file", "wb")
    >>> patchstream(unpatched, save_to, delta)
"""

import collections
import hashlib

if not(hasattr(__builtins__, "bytes")) or str is bytes:
    # Python 2.x compatibility
    def bytes(var, *args):
        try:
            return ''.join(map(chr, var))
        except TypeError:
            return map(ord, var)

__all__ = ["rollingchecksum", "weakchecksum", "patchstream", "rsyncdelta",
    "blockchecksums"]


def rsyncdelta(datastream, remotesignatures, blocksize=4096):
    """
    Generates a binary patch when supplied with the weak and strong
    hashes from an unpatched target and a readable stream for the
    up-to-date data. The blocksize must be the same as the value
    used to generate remotesignatures.
    """
    remote_weak, remote_strong = remotesignatures

    match = True
    matchblock = -1
    deltaqueue = collections.deque()

    while True:
        if match and datastream is not None:
            # Whenever there is a match or the loop is running for the first
            # time, populate the window using weakchecksum instead of rolling
            # through every single byte which takes at least twice as long.
            window = collections.deque(bytes(datastream.read(blocksize)))
            checksum, a, b = weakchecksum(window)

        try:
            # If there are two identical weak checksums in a file, and the
            # matching strong hash does not occur at the first match, it will
            # be missed and the data sent over. May fix eventually, but this
            # problem arises very rarely.
            matchblock = remote_weak.index(checksum, matchblock + 1)
            stronghash = hashlib.md5(bytes(window)).hexdigest()
            matchblock = remote_strong.index(stronghash, matchblock)

            match = True
            deltaqueue.append(matchblock)

            if datastream.closed:
                break
            continue

        except ValueError:
            # The weakchecksum did not match
            match = False
            try:
                if datastream:
                    # Get the next byte and affix to the window
                    newbyte = ord(datastream.read(1))
                    window.append(newbyte)
            except TypeError:
                # No more data from the file; the window will slowly shrink.
                # newbyte needs to be zero from here on to keep the checksum
                # correct.
                newbyte = 0
                tailsize = datastream.tell() % blocksize
                datastream = None

            if datastream is None and len(window) <= tailsize:
                # The likelihood that any blocks will match after this is
                # nearly nil so call it quits.
                deltaqueue.append(window)
                break

            # Yank off the extra byte and calculate the new window checksum
            oldbyte = window.popleft()
            checksum, a, b = rollingchecksum(oldbyte, newbyte, a, b, blocksize)

            # Add the old byte the file delta. This is data that was not found
            # inside of a matching block so it needs to be sent to the target.
            try:
                deltaqueue[-1].append(oldbyte)
            except (AttributeError, IndexError):
                deltaqueue.append([oldbyte])

    # Return a delta that starts with the blocksize and converts all iterables
    # to bytes.
    deltastructure = [blocksize]
    for element in deltaqueue:
        if isinstance(element, int):
            deltastructure.append(element)
        elif element:
            deltastructure.append(bytes(element))

    return deltastructure


def blockchecksums(instream, blocksize=4096):
    """
    Returns a list of weak and strong hashes for each block of the
    defined size for the given data stream.
    """
    weakhashes = list()
    stronghashes = list()
    read = instream.read(blocksize)

    while read:
        weakhashes.append(weakchecksum(bytes(read))[0])
        stronghashes.append(hashlib.md5(read).hexdigest())
        read = instream.read(blocksize)

    return weakhashes, stronghashes


def patchstream(instream, outstream, delta):
    """
    Patches instream using the supplied delta and write the resultantant
    data to outstream.
    """
    blocksize = delta[0]

    for element in delta[1:]:
        if isinstance(element, int) and blocksize:
            instream.seek(element * blocksize)
            element = instream.read(blocksize)
        outstream.write(element)


def rollingchecksum(removed, new, a, b, blocksize=4096):
    """
    Generates a new weak checksum when supplied with the internal state
    of the checksum calculation for the previous window, the removed
    byte, and the added byte.
    """
    a -= removed - new
    b -= removed * blocksize - a
    return (b << 16) | a, a, b


def weakchecksum(data):
    """
    Generates a weak checksum from an iterable set of bytes.
    """
    a = b = 0
    l = len(data)
    for i in range(l):
        a += data[i]
        b += (l - i)*data[i]

    return (b << 16) | a, a, b

# def test_blockchecksums0():
#     unpatched = open("/home/tierney/src/safe-deposit-box/src/SafeDepositBox/50MB.txt","rb")
#     hashes = blockchecksums(unpatched, blocksize=4194304)
#     return hashes

# def test_blockchecksums1():
#     unpatched = open("/home/tierney/src/safe-deposit-box/src/SafeDepositBox/4MB.txt","rb")
#     hashes = blockchecksums(unpatched, blocksize=4 * (2 ** 20))
#     return hashes

def test_patchedfile():
    unpatched = open("/home/tierney/src/safe-deposit-box/src/SafeDepositBox/4MB.txt","rb")
    hashes = blockchecksums(unpatched, blocksize=4194304)
    patchedfile = open("/home/tierney/src/safe-deposit-box/src/SafeDepositBox/4MBpatched.txt","rb")
    delta = rsyncdelta(patchedfile, hashes)
    print delta

def test_patchedfile0():
    unpatched = open("export0.pdf","rb")
    hashes = blockchecksums(unpatched, blocksize=4 * (2 ** 10))
    import pprint
    pprint.pprint(hashes)
    patchedfile = open("export1.pdf","rb")
    delta = rsyncdelta(patchedfile, hashes)
    with open("export1-new.pdf","w") as fh:
        patchstream(unpatched, fh, delta)

    print
    print len(delta)
    print
    print delta.__sizeof__()
    for delt in delta:
        if type(delt) == type(0):
            print "INT:", delt
        else:
            print "list?:", len(delt), delt.__sizeof__()

def iosprint(fin):
    print fin.readlines()
    fin.seek(0)

if __name__ == "__main__":
    test_patchedfile0()
    import sys
    sys.exit(0)

    import random
    import time

    xrange = range
    try:
        from StringIO import StringIO
    except ImportError:
        from io import BytesIO as StringIO

    # Generates random data for the test
    datasize = 1<<16
    datasize = 4 * (2 ** 10)
    
    targetdata = ''.join([chr(random.randint(0, 127)) for n in range(datasize)])
    chunks = [targetdata[i:i+2048] for i in xrange(0, 1<<17, 2048)]
    for i in xrange(8):
        a, b = (
            random.randrange(0, len(chunks)), random.randrange(0, len(chunks)))
        chunks[a], chunks[b] = chunks[b], chunks[a]

    hostdata = ''.join(chunks)

    # targetstream: file to be patched
    # hoststream: what the unpatched target needs to become
    # mergedstream: output after patching

    # Python 3 bytes compatibility
    mergedstream = StringIO()
    if __builtins__.bytes == str:
        targetstream = StringIO(targetdata)
        hoststream = StringIO(hostdata)
    else:
        targetstream = StringIO(bytes(targetdata, "ascii"))
        hoststream = StringIO(bytes(hostdata, "ascii"))

    iosprint(targetstream)
    targetchecksums = blockchecksums(targetstream)
    print
    print targetchecksums
    print

    binarypatch = rsyncdelta(hoststream, targetchecksums)
    print
    print binarypatch
    print

    
    patchstream(targetstream, mergedstream, binarypatch)

    
    print binarypatch
    iosprint(mergedstream)

    mergedstream.seek(0)
    patcheddata = mergedstream.read()
    if __builtins__.bytes == str:
        print "assume bytes means str"
        assert patcheddata == hostdata
    else:
        print "not assuming bytes means str"
        assert str(patcheddata, 'ascii') == hostdata

    print("Test passed.")
