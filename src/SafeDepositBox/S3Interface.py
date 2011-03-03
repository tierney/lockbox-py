import ConfigParser
import calendar
import os
import random
import string
import sys
import time
import boto
import Queue

import constants as C
from util import execute
from S3BucketPolicy import string_to_dns
import md5

BUCKET_NAME_PADDING_LEN = 20
METADATA_TAG_MD5 = 'orig_file_md5'

class S3Bucket:
    def __init__(self, display_name, location, bucket_name, staging_directory,
                 aws_access_key_id, aws_secret_access_key):
        self.display_name = display_name
        self.location = location
        self.bucket_name = bucket_name
        self.staging_directory = staging_directory
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.queue = Queue.Queue()

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
        self.bucket.make_public()
        pass

    def create_bucket(self):
        # Need to make creating a public bucket and admin bucket easy.
        # 
        # store the bucket_name in our configuration
        display_name = string_to_dns(self.display_name)
        display_location = string_to_dns(self.location)

        s = "".join([random.choice(string.lowercase+string.digits)
                     for x in range(1, BUCKET_NAME_PADDING_LEN)])
        bucket_name = '.'.join([display_name, display_location, s])
        return bucket_name
        #self._create_bucket(s)
        
    def get_all_buckets(self):
        return self.conn.get_all_buckets()

    def get_all_keys(self):
        # check if bucket exists?
        return self.bucket.get_all_keys()

    def send_filename(self, s3key, filename_src, file_md5):
        key = boto.s3.key.Key(self.bucket, s3key)
        key.set_metadata(METADATA_TAG_MD5, file_md5)
        key.set_contents_from_filename(filename_src)
 
    def get_metadata(self, s3key, metadata):
        key = self.bucket.get_key(s3key)
        print key.md5
        return key.get_metadata(metadata)

    def get_filename(self, s3key, filename_dest):
        # could add a progress meter here.
        key = self.bucket.get_key(s3key)
        print key.last_modified
        if key:
            key.get_contents_to_filename(filename_dest)
            return filename_dest
        return None

    def enqueue(self, filename, state):
        self.queue.put([filename, state])

    def proc_queue(self, prefix_to_ignore, enc_service):
        while True:
            filename, state = self.queue.get()
            relative_filepath = filename.replace(prefix_to_ignore,'')
            key_filename = '.'.join([relative_filepath, self.display_name, self.location])
            if C.PNEW == state:
                C.PNEW_key = self.bucket.get_key(key_filename)
                with open(filename) as fp:
                    file_md5 = boto.s3.key.Key().compute_md5(fp)[0]
                if not C.PNEW_key: # New file when we started up
                    enc_filepath = enc_service.bundle(filename)
                    val_filename = os.path.join(self.staging_directory, enc_filepath)
                    self.send_filename(key_filename, val_filename, file_md5)
                else: # Existing file. Checking if stale.
                    with open(filename) as fp:
                        md5, md5b64 = C.PNEW_key.compute_md5(fp)
                    if C.PNEW_key.get_metadata(METADATA_TAG_MD5) != md5:
                        enc_filepath = enc_service.bundle(filename)
                        val_filename = os.path.join(self.staging_directory, enc_filepath)
                        self.send_filename(key_filename, val_filename, file_md5)
                        
            if C.UPDATED == state:
                with open(filename) as fp:
                    md5, md5b64 = boto.s3.key.Key().compute_md5(fp)
                enc_filepath = enc_service.bundle(filename)
                val_filename = os.path.join(self.staging_directory, enc_filepath)
                self.send_filename(key_filename, val_filename, md5)

            if C.NOT_VISITED == state:
                # delete file(s)...
                relative_filepath = filename.replace(prefix_to_ignore,'')
                keys = self.bucket.get_all_keys(prefix=relative_filepath)
                for key in keys:
                    self.bucket.delete_key(key)
            
            self.queue.task_done()


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

    b = S3Bucket("John Smith", "Bronx iMac", 'testfiles.sdb', '/home/tierney/.safedepositbox/staging',
                 aws_access_key_id, aws_secret_access_key)
    print b.get_all_buckets()
    for k in b.get_all_keys():
        mtime = k.last_modified
        print mtime
        print time.strptime(mtime.replace("Z",''), u"%Y-%m-%dT%H:%M:%S.000")
        print calendar.timegm(time.strptime(mtime.replace("Z",''), u"%Y-%m-%dT%H:%M:%S.000"))
        print "   ",k, mtime

    b.create_bucket()

    
    b.send_filename('DESIGN', 'DESIGN', md5)

    # b.get_filename('key1','key1.DESIGN')

    # b = boto.s3.bucket.Bucket(s3c, 'testfiles.sdb')
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
