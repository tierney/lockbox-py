#!/usr/bin/env python

import os
import subprocess

def execute(cmd):
    subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE,
                     stderr=subprocess.PIPE).communicate()
def init_dir(directory):
    if not os.path.exists(directory):
        os.mkdir(directory)
    elif not os.path.isdir(directory):
        os.remove(directory)
        os.mkdir(directory)
