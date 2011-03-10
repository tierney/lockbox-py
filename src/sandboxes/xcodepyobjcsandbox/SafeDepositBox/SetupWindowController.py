#
#  SetupWindowController.py
#  SafeDepositBox
#
#  Created by Matt Tierney on 2/27/11.
#  Copyright (c) 2011 NYU. All rights reserved.
#

from objc import YES, NO, IBAction, IBOutlet
from Foundation import *
from AppKit import *

import ConfigParser
import os
import SafeDepositBoxAppDelegate
from SDBStatusBar import SDBStatusBar

class SetupWindowController(NSWindowController):
    """
    Make sure that the nib/xib that contains our setup menu is NOT set to be
    visible when our application launches.
    """
    firstName = IBOutlet()
    lastName = IBOutlet()
    userEmailAddress = IBOutlet()
    userPassword = IBOutlet()
    verifyPassword = IBOutlet()
    awsAccessKey = IBOutlet()
    awsSecretKey = IBOutlet()
    computerName = IBOutlet()
    
    def awakeFromNib(self):
        NSLog("Check if we already have a conf file.")
        admin_directory = os.path.join(os.environ["HOME"], ".safedepositbox")
        config_filepath = os.path.join(admin_directory, "safedepositbox.conf")
        # Check if configuration file exists and either create it with user data
        # or launch the statusbar.
        if not os.path.exists(config_filepath):
            wc = self.initWithWindowNibName_("MainMenu")
            wc.showWindow_(self)
        else:
            SDBStatusBar.alloc().doDisplay(self)
            
    @IBAction
    def saveClose_(self, sender):
        # Logic for controlling the setup menu.
        values = { 'firstName' : self.firstName.stringValue(),
                   'lastName': self.lastName.stringValue(),
                   'userEmailAddress' : self.userEmailAddress.stringValue(),
                   'userPassword' : self.userPassword.stringValue(),
                   'verifyPassword' : self.verifyPassword.stringValue(),
                   'awsAccessKey' : self.awsAccessKey.stringValue(),
                   'awsSecretKey' : self.awsSecretKey.stringValue(),
                   'computerName' : self.computerName.stringValue(),
                   'sdbDirectory' : os.path.join(os.environ["HOME"],
                                                 "SafeDepositBox"),
                    }
                           
        rcp = ConfigParser.RawConfigParser()
        section = "sdb"
        rcp.add_section(section)

        bClose = True
        for key in values:
            val = values.get(key)
            if not val:
                bClose = False
            rcp.set(section, key, val)

        if (bClose and 
            (values.get('userPassword') != values.get('verifyPassword'))):
            # Tell user that their passwords don't match (show highlighted box?)
            bClose = False

        if bClose:
            # Create Admin Directory
            admin_directory = os.path.join(os.environ["HOME"], 
                                           ".safedepositbox")
            if not os.path.exists(admin_directory):
                os.mkdir(admin_directory)
            elif not os.path.isdir(admin_directory):
                os.remove(admin_directory)
                os.mkdir(admIn_directory)
                
            config_filepath = os.path.join(admin_directory, 
                                           "safedepositbox.conf")                                           
            with open(config_filepath,'w') as fh:
                rcp.write(fh)
            NSLog("Wrote configuration file!")

            # Show status bar now that we have initialized everything.
            SDBStatusBar.alloc().doDisplay(self)

            self.close()
		
    @IBAction
    def updateField_(self, sender):
        print "Updating Field value: %s" % sender.stringValue()
