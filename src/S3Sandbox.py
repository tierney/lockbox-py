#!/usr/bin/env python
import ConfigParser
import os
import random
import string
import sys
import boto
from S3BucketPolicy import string_to_dns

class S3Bucket:
    def __init__(self, display_name, location, bucket_name,
                 aws_access_key_id, aws_secret_access_key):
        self.display_name = display_name
        self.location = location
        self.bucket_name = bucket_name
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key

    def init(self):
        self._connect()
        # should check if the bucket exists in S3.
        self._set_bucket(self.bucket_name)

    def _connect(self):
        self.conn = boto.connect_s3(self.aws_access_key_id,
                                    self.aws_secret_access_key)
    def _set_bucket(self, bucket_name):
        self.bucket = boto.s3.bucket.Bucket(self.conn, bucket_name)

    def _create_bucket(self, bucket_name):
        self.conn.create_bucket(bucket_name)
        self.bucket = self.conn.get_bucket(bucket_name)
        self.bucket.configure_versioning(True)
        pass

    def create_bucket(self):
        # store the bucket_name in our configuration
        # replace '/','-'
        # replace '+','-'
        display_name = string_to_dns(self.display_name)
        display_location = string_to_dns(self.location)
        print display_name
        print display_location
        desired_length = 20
        s = "".join([random.choice(string.lowercase+string.digits)
                     for x in range(1, desired_length)])
        print s
        bucket_name = '.'.join([display_name, display_location,s])
        print bucket_name
        print len(bucket_name)
        #self._create_bucket(s)
        
    def get_all_buckets(self):
        return self.conn.get_all_buckets()

    def get_all_keys(self):
        # check if bucket exists?
        return self.bucket.get_all_keys()

    def send_filename(self, s3key, filename_src):
        key = boto.s3.key.Key(self.bucket, s3key)
        key.set_contents_from_filename(filename_src)

    def get_filename(self, s3key, filename_dest):
        # could add a progress meter here.
        key = self.bucket.get_key(s3key)
        print key.last_modified
        if key:
            key.get_contents_to_filename(filename_dest)
            return filename_dest
        return None

def main():
    # User must setup an AWS account
    config = ConfigParser.ConfigParser()
    sysname = os.uname()[0]
    if ('Linux' == sysname):
        config.read("/home/tierney/conf/aws.cfg")
    elif ('Darwin' == sysname):
        config.read("/Users/tierney/conf/aws.cfg")
    else:
        sys.exit(1)

    aws_access_key_id = config.get('aws','access_key_id')
    aws_secret_access_key = config.get('aws','secret_access_key')

    b = S3Bucket("John Smith", "Bronx iMac", 'testfiles.sdb', 
                 aws_access_key_id, aws_secret_access_key)
    b.init()
    print b.get_all_buckets()
    for k in b.get_all_keys():
        print "   ",k
    print b.create_bucket()

    # b.send_filename('key1', 'DESIGN')
    # b.get_filename('key1','key1.DESIGN')

    #b = boto.s3.bucket.Bucket(s3c, 'testfiles.sdb')
    # b.add_email_grant(<AWS user's email address>)
    # b.configure_versioning(True)

    # k = boto.s3.key.Key(b, 'key0')
    # # k.add_email_grant(<AWS user's email address>)
    # k.set_contents_from_filename("DESIGN.enc")

    # k = boto.s3.key.Key(b, 'dir0/dir1/dir2/key0')
    # k.set_contents_from_filename("DESIGN.enc")

    # k = boto.s3.key.Key(b, 'dir0/dir1/dir3/key0')
    # k.set_contents_from_filename("DESIGN.enc")

    # k = boto.s3.key.Key(b, 'dir0/dir1/dir2/key1')
    # k.set_contents_from_filename("DESIGN.enc")

if __name__=="__main__":
    main()
