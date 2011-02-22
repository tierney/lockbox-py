#!/usr/bin/env python

import boto
import ConfigParser
import socket

class S3Bucket:
    def __init__(self, display_name, location,
                 aws_access_key_id, aws_secret_access_key):
        self.display_name = display_name
        self.location = location
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key

    def connect(self):
        self.conn = boto.s3.connection.S3Connection(self.aws_access_key_id,
                                                    self.aws_secret_access_key)

    def create_bucket(self):
        self.conn.create_bucket("")

    def get_all_buckets(self):
        return self.conn.get_all_buckets()

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

    # just to be sure we don't have an IP address
    if (4 == len(string.split('.'))):
        string = string.replace('.','-')
    
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
    
def main():
    # User must setup an AWS account
    config = ConfigParser.ConfigParser()
    config.read("/home/tierney/conf/aws.cfg")

    aws_access_key_id = config.get('aws','access_key_id')
    aws_secret_access_key = config.get('aws','secret_access_key')

    b = S3Bucket(aws_access_key_id, aws_secret_access_key)
    b.connect()

    b.get_all_buckets()
    
    s3c = boto.s3.connection.S3Connection(aws_access_key_id, aws_secret_access_key)

    b = boto.s3.bucket.Bucket(s3c, 'testfiles.sdb')
    # b.add_email_grant(<AWS user's email address>)
    b.configure_versioning(True)
    
    k = boto.s3.key.Key(b, 'key0')
    # k.add_email_grant(<AWS user's email address>)
    k.set_contents_from_filename("DESIGN.enc")

    k = boto.s3.key.Key(b, 'dir0/dir1/dir2/key0')
    k.set_contents_from_filename("DESIGN.enc")

    k = boto.s3.key.Key(b, 'dir0/dir1/dir3/key0')
    k.set_contents_from_filename("DESIGN.enc")

    k = boto.s3.key.Key(b, 'dir0/dir1/dir2/key1')
    k.set_contents_from_filename("DESIGN.enc")

if __name__=="__main__":
    string_to_dns_test()
    #main()
