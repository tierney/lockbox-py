#
#  SafeDepositBoxAppDelegate.py
#  SafeDepositBox
#
#  Created by Matt Tierney on 2/27/11.
#  Copyright NYU 2011. All rights reserved.
#

from objc import YES, NO, IBAction, IBOutlet
from Foundation import *
from AppKit import *

from SDBStatusBar import SDBStatusBar
import SetupWindowController
import os

start_time = NSDate.date()

class SafeDepositBoxAppDelegate(NSObject):
            
    def applicationDidFinishLaunching_(self, sender):
        NSLog("Application did finish launching.")
                
        NSBundle.loadNibNamed_owner_("MainMenu", NSApp)
