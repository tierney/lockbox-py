#!/usr/bin/env python

import gflags
import gnupg
import logging
import sys

# logging.basicConfig(level=logging.DEBUG)

FLAGS = gflags.FLAGS
gflags.DEFINE_boolean('generate_keys', False, 'Generate the keys.')
gflags.DEFINE_boolean('delete_keys', False,
                      'Delete secret and regular keys in keyring.')


class GPGTest(object):
  def __init__(self, gpg):
    assert isinstance(gpg, gnupg.GPG)
    self.gpg = gpg
    self.fingerprints = []

  # def __del__(self):
  #   self.delete_keys()


  def delete_keys(self):
    self.fingerprints = self.gpg.list_keys(secret=True).fingerprints
    for fingerprint in self.fingerprints:
      logging.info('Deleting: %s.' % fingerprint)
      self.gpg.delete_keys(fingerprint, secret=True)
      self.gpg.delete_keys(fingerprint)


  def generate_key(self, first_name, last_name, domain,
                   comment='', passphrase=None):
    """Generate a key"""
    dsa_params = {
      'Key-Type': 'DSA',
      'Key-Length': 1024,
      'Subkey-Type': 'ELG-E',
      'Subkey-Length': 4096,
      'Name-Comment': comment,
      'Expire-Date': 0,
      }

    params = {
      'Key-Type': 'RSA',
      'Key-Length': 2048,
      'Subkey-Type': 'RSA',
      'Subkey-Length': 2048,
      'Name-Comment': comment,
      'Expire-Date': 0,
      }

    params['Name-Real'] = '%s %s' % (first_name, last_name)
    params['Name-Email'] = ('%s.%s@%s' % (first_name, last_name, domain)).lower()
    if passphrase is None:
      passphrase = ('%s%s' % (first_name[0], last_name)).lower()
    params['Passphrase'] = passphrase
    cmd = self.gpg.gen_key_input(**params)
    return self.gpg.gen_key(cmd)


  def generate_keys(self):
    result = self.generate_key('George', 'Washington', '1789.com',
                               'First President.')
    self.fingerprints.append(result.fingerprint)
    logging.info('Generated key %s.' % result.fingerprint)
    result = self.generate_key('John', 'Adams', '1797.com',
                               'Second President.')
    self.fingerprints.append(result.fingerprint)
    logging.info('Generated key %s.' % result.fingerprint)
    result = self.generate_key('Thomas', 'Jefferson', '1801.com',
                               'Third President.')
    self.fingerprints.append(result.fingerprint)
    logging.info('Generated key %s.' % result.fingerprint)
    result = self.generate_key('James', 'Madison', '1809.com',
                               'Fourth President.')
    self.fingerprints.append(result.fingerprint)
    logging.info('Generated key %s.' % result.fingerprint)
    result = self.generate_key('James', 'Monroe', '1817.com',
                               'Fifth President.')
    self.fingerprints.append(result.fingerprint)
    logging.info('Generated key %s.' % result.fingerprint)


def main(argv):
  try:
    argv = FLAGS(argv)
  except gflags.FlagsError, e:
    print '%s\\nUsage: %s ARGS\\n%s' % (e, sys.argv[0], FLAGS)
    sys.exit(1)

  gpg = gnupg.GPG()
  gpg_test = GPGTest(gpg)

  if FLAGS.generate_keys:
    gpg_test.generate_keys()

  if FLAGS.delete_keys:
    gpg_test.delete_keys()


if __name__=='__main__':
  main(sys.argv)
