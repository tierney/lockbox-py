#!/usr/bin/env python

def execute(cmd):
    subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE,
                     stderr=subprocess.PIPE).communicate()
