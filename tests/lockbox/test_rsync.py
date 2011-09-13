#!/usr/bin/env python

from lockbox.rsync import blockchecksums, rsyncdelta, patchstream
import random
import time
import unittest


class RSyncTestCase(unittest.TestCase):
  def setUp(self):
    pass

  def tearDown(self):
    pass

  def test_rsync(self):
    xrange = range
    try:
        from StringIO import StringIO
    except ImportError:
        from io import BytesIO as StringIO

    # Generates random data for the test
    datasize = 1<<16
    datasize = 4 * (2 ** 20)

    targetdata = ''.join([chr(random.randint(0, 127)) for n in range(datasize)])
    chunks = [targetdata[i:i+2048] for i in xrange(0, 1<<17, 2048)]
    for i in xrange(8):
        a, b = (
            random.randrange(0, len(chunks)), random.randrange(0, len(chunks)))
        chunks[a], chunks[b] = chunks[b], chunks[a]

    hostdata = ''.join(chunks)

    # targetstream: file to be patched (original)
    # hoststream: what the unpatched target needs to become (newer version)
    # mergedstream (patcheddata): output after patching

    # Python 3 bytes compatibility
    mergedstream = StringIO()
    if __builtins__.get('bytes') == str:
        targetstream = StringIO(targetdata)
        hoststream = StringIO(hostdata)
    else:
        targetstream = StringIO(bytes(targetdata, "ascii"))
        hoststream = StringIO(bytes(hostdata, "ascii"))

    targetchecksums = blockchecksums(targetstream)
    binarypatch = rsyncdelta(hoststream, targetchecksums)
    patchstream(targetstream, mergedstream, binarypatch)

    mergedstream.seek(0)
    patcheddata = mergedstream.read()
    if __builtins__.get('bytes') == str:
      print "assume bytes means str"
      assert patcheddata == hostdata
    else:
      print "not assuming bytes means str"
      assert str(patcheddata, 'ascii') == hostdata

if __name__ == '__main__':
  unittest.main()
