#!/usr/bin/env python

import os

class SafeDepositBox:
    def __init__(self):
        self.storage_directory = os.path.join(os.environ['HOME'],
                                              ".safedepositbox")
    def check_for_keys(self):
        pass

def main():
    sdb = SafeDepositBox()
    print sdb.storage_directory
    pass

if __name__=="__main__":
    main()
