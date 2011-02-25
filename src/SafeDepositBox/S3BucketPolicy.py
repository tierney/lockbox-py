#!/usr/bin/env python

import boto
import socket

def string_to_dns(string):
    # Reasonble replacements (don't know if users will hate us for this)
    string = string.replace(' ','-')
    string = string.replace('_','-')
    string = string.replace('.','-')
    string = string.replace("'","")
    string = string.strip('-')
    string = string.strip()

    # Check if reasonable replacements were insufficient
    for c in list(string):
        if ((not c.isalnum()) and (c != '.') and (c != '-')):
            return None

    # Check length of the string
    string = string.lower()
    if len(string) < 3:
        return None

    if len(string) > 63:
        string = string[:63]

    # Make sure we do not have an IP address
    try:
        socket.inet_aton(string)
        # we have a legal ip address (so bad!)
        return None
    except socket.error:
        # we have an invalid ip addr, so we might be okay
        pass

    return string

def string_to_dns_test():
    print string_to_dns("he")
    print string_to_dns("he               ")    
    print string_to_dns("hello worlds")
    print string_to_dns("hello worlds!")
    print string_to_dns("hello worlds-")
    print string_to_dns("hello's worlds-")
    print string_to_dns("hello's worlds---")
    print string_to_dns("hello\"s worlds---")
    print string_to_dns("Matt Tierney's Bronx iMac "*10)
    print string_to_dns("140.247.61.26")
    print string_to_dns("277.247.61.26")
    print string_to_dns("I-.-.-like--.three.dots")
    print string_to_dns("I.like.three.dots")
