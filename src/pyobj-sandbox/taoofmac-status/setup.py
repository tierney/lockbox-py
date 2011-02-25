'''
Minimal setup.py example, run with:
% python setup.py py2app
'''

from distutils.core import setup
import py2app

NAME = 'SafeDepositBox'
SCRIPT = 'SafeDepositBox.py'
VERSION = '0.1'
ID = 'safedepositbox'

plist = dict(
     CFBundleName                = NAME,
     CFBundleShortVersionString  = ' '.join([NAME, VERSION]),
     CFBundleGetInfoString       = NAME,
     CFBundleExecutable          = NAME,
     CFBundleIdentifier          = 'com.trustycloudapps.%s' % ID,
     LSUIElement                 = '1'
)


app_data = dict(script=SCRIPT, plist=plist)

setup(
   app = [app_data],
)
