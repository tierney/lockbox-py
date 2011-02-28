#
#  main.py
#  SafeDepositBox
#
#  Created by Matt Tierney on 2/27/11.
#  Copyright NYU 2011. All rights reserved.
#

#import modules required by application
import objc

#import Foundation
#import AppKit

from Foundation import *
from AppKit import *

from PyObjCTools import AppHelper

# import modules containing classes required to start application and load MainMenu.nib
import SafeDepositBoxAppDelegate
import os

# bummer that this is causing me grief.
app = NSApplication.sharedApplication()

#admin_directory = os.path.join(os.environ["HOME"], ".safedepositbox")
#config_filepath = os.path.join(admin_directory, "safedepositbox.conf")
#if not os.path.exists(config_filepath):
#	NSBundle.loadNibNamed_owner_("MainMenu", NSApp)
#else:

delegate = SafeDepositBoxAppDelegate.SafeDepositBoxAppDelegate.alloc().init()
app.setDelegate_(delegate)

# pass control to AppKit
AppHelper.runEventLoop()