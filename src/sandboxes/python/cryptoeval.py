#!/usr/bin/env python

import M2Crypto

def ocb():
    pass

k = M2Crypto.RSA.gen_key(2048,11, ocb)


