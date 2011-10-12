#!/usr/bin/env python
"""
You specify the resource using the following Amazon Resource Name (ARN) format:
arn:aws:<vendor>:<region>:<namespace>:<relative-id>

vendor identifies the AWS product (e.g., sns) region is the AWS Region the
resource resides in (e.g., us-east-1), if any namespace is the AWS account ID
with no hyphens (e.g., 123456789012) relative-id is the service specific portion
that identifies the specific resource For example, an Amazon SQS queue might be
addressed with the following ARN: arn:aws:sqs:us-east-1:987654321000:MyQueue

Some resources may not use every field in an ARN. For example, resources in
Amazon S3 are global, so they omit the region field: arn:aws:s3:::bucket/*
"""

import boto
from crypto_util import get_random_uuid

class AWSIAMPolicy(object):
  def __init__(self, account_id, bucket_name, lock_domain, data_domain,
               topic_name):
    self.account_id = account_id
    self.bucket_name = bucket_name
    self.lock_domain = lock_domain
    self.data_domain = data_domain
    self.topic_name = topic_name


  def json_policy(self):
    return '''{
  "Statement": [
    {
      "Sid": "s3",
      "Action": [
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::%s/*"
      ]
    },
    {
      "Sid": "lockdomain",
      "Action": [
        "sdb:GetAttributes",
        "sdb:PutAttributes",
        "sdb:Select"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:sdb:us-east-1:%s:domain/%s"
      ]
    },
    {
      "Sid": "datadomain",
      "Action": [
        "sdb:GetAttributes",
        "sdb:PutAttributes",
        "sdb:Select"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:sdb:us-east-1:%s:domain/%s"
      ]
    },
    {
      "Sid": "sns",
      "Action": [
        "sns:Publish",
        "sns:Subscribe"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:sns:us-east-1:%s:%s"
      ]
    }
  ]
}''' % (self.bucket_name, self.account_id, self.lock_domain, self.account_id,
        self.data_domain, self.account_id, self.topic_name)


  def create_user(self, user_name):
    try:
      resp = self.iam_connection.create_user(user_name)
    except boto.exception.BotoServerError, e:
      logging.error(e)
      return False

    try:
      resp = self.iam_connection.create_access_key(user_name)
    except Exception, e:
      logging.error('FIX CODE with more specific exception handling (%s).' % e)
      return False

    try:
      access_key = resp['create_access_key_response']['create_access_key_result']['access_key']
    except Exception, e:
      logging.error('FIX CODE with more specific exception handling (%s).' % e)
      return False

    access_key_id = access_key['access_key_id']
    secret_access_key = access_key['secret_access_key']
    print access_key_id, secret_access_key


def main():
  account_id = '135090458419'
  account_alias = '0d08b0ac664c432ba4265de479ecfee4'
  aws = AWSIAMPolicy(account_alias, 'safe-deposit-box', 'lock_domain',
                     'data_domain', 'group0')

  iam_connection = boto.connect_iam()
  # account_alias = get_random_uuid()
  # print "Account alias:", account_alias
  # iam_connection.create_account_alias(account_alias)
  group_name = get_random_uuid()
  print "Group name:", group_name
  iam_connection.create_group(group_name)
  iam_connection.put_group_policy(group_name, group_name + '-policy',
                                  aws.json_policy())

