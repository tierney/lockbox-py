#!/usr/bin/env python

import logging
import gflags
import gnupg
import sys
from simpledb import get_domain, _print_all_domain
from boto import connect_sdb
from crypto_util import hash_string

FLAGS = gflags.FLAGS
gflags.DEFINE_string('domain', '', 'Domain.')
gflags.DEFINE_boolean('list_domains', False, 'List domains.')
gflags.DEFINE_boolean('print_domain', False, 'Print entire domain.')
gflags.DEFINE_boolean('delete_domain', False, 'Delete entire domain.')
gflags.DEFINE_multistring('delete_domain_items', None,
                          'Delete specified items from domain.')
gflags.DEFINE_boolean('debug', False, 'produces debugginpg output')


def print_domain(domain_name):
  connection = connect_sdb()
  if not connection.lookup(domain_name, validate=True):
    return
  domain = get_domain(connection, domain_name)
  _print_all_domain(domain)


def delete_domain(domain_name):
  connection = connect_sdb()
  connection.delete_domain(domain_name)
  logging.info('Delete domain.')


def delete_domain_items(domain_name):
  connection = connect_sdb()
  if not FLAGS.delete_domain_items:
    return
  if not connection.lookup(domain_name, validate=True):
    return
  else:
    domain = connection.get_domain(domain_name, validate=True)
  for item_name in FLAGS.delete_domain_items:
    item = domain.get_item(item_name, consistent_read=True)
    if not item:
      logging.error('Missing item: %s.' % item_name)
      continue
    domain.delete_item(item)
    logging.info('Deleted item: %s.' % item_name)


def list_domains():
  connection = connect_sdb()
  for i, domain in enumerate(connection.get_all_domains()):
    logging.info('Domain #%3d: \'%s\'' % (i, domain.name))


def key_limit():
  gpg = gnupg.GPG()
  keyid = '3fa60037'
  exported_keys = gpg.export_keys(keyid)
  print exported_keys
  print len(exported_keys)
  connection = connect_sdb()
  gpg_test_domain_name = 'gpg_test_domain'

  if not connection.lookup(gpg_test_domain_name):
    domain = connection.create_domain(gpg_test_domain_name)
  else:
    domain = connection.get_domain(gpg_test_domain_name, validate=True)

  item = domain.new_item('keys')
  item[keyid] = hash_string(exported_keys)
  item.save()

  connection.delete_domain(gpg_test_domain_name)


def main(argv):
  # key_limit()
  # return

  try:
    argv = FLAGS(argv)
  except gflags.FlagsError, e:
    print '%s\\nUsage: %s ARGS\\n%s' % (e, sys.argv[0], FLAGS)
    sys.exit(1)
  if FLAGS.debug:
    print 'non-flag arguments:', argv

  if FLAGS.list_domains:
    list_domains()

  if FLAGS.print_domain:
    print_domain(FLAGS.domain)

  if FLAGS.delete_domain_items:
    delete_domain_items(FLAGS.domain)

  if FLAGS.delete_domain:
    delete_domain(FLAGS.domain)


if __name__=='__main__':
  main(sys.argv)
