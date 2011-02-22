#!/usr/bin/env python

import boto
import ConfigParser

def main():
    # User must setup an AWS account
    config = ConfigParser.ConfigParser()
    config.read("/home/tierney/conf/aws.cfg")

    # this application WILL NOT share your AWS access information with
    # anyone.
    aws_access_key_id = config.get('aws','access_key_id')
    aws_secret_access_key = config.get('aws','secret_access_key')

    print aws_access_key_id, aws_secret_access_key
    conn = boto.connect_s3(aws_access_key_id, aws_secret_access_key)
    
    for bucket in conn.get_all_buckets():
        print bucket

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
    main()
