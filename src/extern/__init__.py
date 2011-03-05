'''Adjust sys.path to point to the proper extern helper libraries.'''

import os, sys
BASE = os.path.dirname(__file__)
sys.path = sys.path + [os.path.join(BASE, p) for p in 
                       ['boto',
                        'M2Crypto-0.21.1/build/lib.linux-x86_64-2.7/'
                        ]]

#print sys.stderr >> 'sys.path adjusted.'