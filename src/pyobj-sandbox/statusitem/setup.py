'''
Minimal setup.py example, run with:
% python setup.py py2app
'''

from distutils.core import setup
import py2app

NAME = 'Uptime'
SCRIPT = 'statusitem.py'
VERSION = '0.1'
ID = 'uptime'

plist = dict(
     CFBundleName                = NAME,
     CFBundleShortVersionString  = ' '.join([NAME, VERSION]),
     CFBundleGetInfoString       = NAME,
     CFBundleExecutable          = NAME,
     CFBundleIdentifier          = 'org.livingcode.examples.%s' % ID,
     LSUIElement                 = '1'
)


app_data = dict(script=SCRIPT, plist=plist)

setup(
   app = [app_data],
)
