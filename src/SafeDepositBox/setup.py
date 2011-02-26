from distutils.core import setup
import py2app

NAME = 'SafeDepositBox'
SCRIPT = 'SnowLeopard-SafeDepositBox.py'
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

DATA_FILES = ['S3Interface.py',
              'S3BucketPolicy.py',
              'EncryptionService.py',
              'util.py',
              'constants.py',
              '../../bin/images/safe3.png']

OPTIONS = {'iconfile': '../../bin/images/safe.icns',
           'packages': ['email','boto'], # this is a hack. boto and py2app
                                 # don't like each other otherwise.
           'argv_emulation': True,
           }

setup(
    app = [app_data],
    data_files=DATA_FILES,
    options={'py2app': OPTIONS},
    setup_requires=['py2app'],
)
