#!/usr/bin/env python

import boto
import ConfigParser
from S3BucketPolicy import string_to_dns_test

class S3Bucket:
    def __init__(self, display_name, location,
                 aws_access_key_id, aws_secret_access_key):
        self.display_name = display_name
        self.location = location
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key

    def connect(self):
        self.conn = boto.connect_s3(self.aws_access_key_id,
                                    self.aws_secret_access_key)
    def create_bucket(self, bucket_name):
        self.conn.create_bucket(bucket_name)
        self.bucket = self.conn.get_bucket(bucket_name)
        self.bucket.configure_versioning(True)

    def get_all_buckets(self):
        return self.conn.get_all_buckets()

    def get_all_keys(self):
        # check if bucket exists?
        return self.bucket.get_all_keys()

    def set_bucket(self, bucket_name):
        # bucket_name = 'testfiles.sdb'
        self.bucket = boto.s3.bucket.Bucket(self.conn, bucket_name)

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
    #config.read("/home/tierney/conf/aws.cfg")
    config.read("/Users/tierney/conf/aws.cfg")

    aws_access_key_id = config.get('aws','access_key_id')
    aws_secret_access_key = config.get('aws','secret_access_key')

    b = S3Bucket("John Smith", "Bronx iMac", aws_access_key_id, aws_secret_access_key)
    b.connect()
    print b.get_all_buckets()
    b.set_bucket('testfiles.sdb')
    print b.get_all_keys()

    b.send_filename('key1', 'DESIGN')
    b.get_filename('key1','key1.DESIGN')

    #b = boto.s3.bucket.Bucket(s3c, 'testfiles.sdb')
    # b.add_email_grant(<AWS user's email address>)
    # b.configure_versioning(True)

#     k = boto.s3.key.Key(b, 'key0')
#     # k.add_email_grant(<AWS user's email address>)
#     k.set_contents_from_filename("DESIGN.enc")

#     k = boto.s3.key.Key(b, 'dir0/dir1/dir2/key0')
#     k.set_contents_from_filename("DESIGN.enc")

#     k = boto.s3.key.Key(b, 'dir0/dir1/dir3/key0')
#     k.set_contents_from_filename("DESIGN.enc")

#     k = boto.s3.key.Key(b, 'dir0/dir1/dir2/key1')
#     k.set_contents_from_filename("DESIGN.enc")

if __name__=="__main__":
    #string_to_dns_test()
    main()
