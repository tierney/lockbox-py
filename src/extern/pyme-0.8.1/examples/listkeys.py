#!/usr/bin/env python
# initial 20080124 bernhard@intevation.de
# 20080124-2: removed some superflous imports
# This script is Free Software under GNU GPL v>=2.
"""A test applicaton for gpg_get_key() protocol.CMS.

Tested on Debian Sid with  
    python-pyme    0.7.0-3
    libgpgme11     1.1.6-1 
    gpgsm          2.0.8-1
"""

from pyme import core

def printgetkeyresults(engine):
    """List all keys for the protocol"""

    print "Keys for protocol %s (%s, %s):" % \
        (core.get_protocol_name(engine.protocol), engine.file_name, engine.version)

    c = core.Context()
    c.set_protocol(engine.protocol)

    for key in c.op_keylist_all(None, False):
        print "key(%s)" % key.subkeys[0].fpr
        for uid in key.uids:
            print "\t%s" % uid.uid

def main():
    # gpgme_check_version() necessary for initialisation according to 
    # gogme 1.1.6 and this is not done automatically in pyme-0.7.0
    print "gpgme version:", core.check_version(None)

    for eng in core.get_engine_info():
        printgetkeyresults(eng)

if __name__ == "__main__":
    main()
