#!/usr/bin/env python

from SafeDepositBox import SafeDepositBox
from CommandLineControls import LockboxCommands
from LoggingHelper import LoggingHelper

def main():
    # always initiate logging first
    LoggingHelper()

    # check/perform initialization
    
    # execute binary
    
    # 

    sdb = SafeDepositBox()
    Thread(target=sdb.S3Conn.proc_queue, args=(sdb.sdb_directory, sdb.crypto_helper)).start()
    sdb.start()

    cli = LockboxCommands()
    cli.cmdloop()

if __name__ == '__main__':
    main()
