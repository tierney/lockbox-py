#!/usr/bin/env python

import logging
import gflags
import sys
from simpledb import get_domain, _print_all_domain
from boto import connect_sdb


FLAGS = gflags.FLAGS
gflags.DEFINE_string('domain', '', 'Domain.')
gflags.DEFINE_boolean('print_domain', True, 'Print entire domain.')
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

  
def main(argv):
  try:
    argv = FLAGS(argv)
  except gflags.FlagsError, e:
    print '%s\\nUsage: %s ARGS\\n%s' % (e, sys.argv[0], FLAGS)
    sys.exit(1)
  if FLAGS.debug:
    print 'non-flag arguments:', argv

  if FLAGS.print_domain:
    print_domain(FLAGS.domain)

  if FLAGS.delete_domain_items:
    delete_domain_items(FLAGS.domain)    

  if FLAGS.delete_domain:
    delete_domain(FLAGS.domain)


if __name__=='__main__':
  main(sys.argv)
