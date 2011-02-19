#!/usr/bin/env python

import boto
import ConfigParser

def main():
    config = ConfigParser.ConfigParser()
    config.read("/home/tierney/conf/aws.cfg")

    aws_access_key_id = config.get('aws','access_key_id')
    aws_secret_access_key = config.get('aws','secret_access_key')

    print aws_access_key_id, aws_secret_access_key
    conn = boto.connect_s3(aws_access_key_id, aws_secret_access_key)
    
    for bucket in conn.get_all_buckets():
        print bucket

    #print conn.get_all_buckets()
if __name__=="__main__":
    main()
