#
#  SDBStatusBar.py
#  SafeDepositBox
#
#  Created by Matt Tierney on 2/28/11.
#  Copyright (c) 2011 NYU. All rights reserved.
#

from Foundation import *
from AppKit import *

from SafeDepositBox import SafeDepositBox
from threading import Thread

start_time = NSDate.date()

class SDBStatusBar(NSObject):

    statusbar = None
    image = None

    def doDisplay(self, sender):
        NSLog("doDisplay called")        
        
        s = SafeDepositBox()
        Thread(target=s.s3bucket.proc_queue, args=(s.prefix_to_ignore, 
                                                   s.enc_service)).start()
        s.start()
        
        self.counter = 0
		
        self.statusbar = NSStatusBar.systemStatusBar()
        # Create the statusbar item
        self.statusitem = self.statusbar.statusItemWithLength_(NSVariableStatusItemLength)

        # Load all images
        path = NSBundle.mainBundle().pathForImageResource_("safe3.png")
        self.image = NSImage.alloc().initWithContentsOfFile_(path)
        print self.image

        # Set initial image
        self.statusitem.setImage_(self.image)

        # Let it highlight upon clicking
        self.statusitem.setHighlightMode_(1)

        # Set a tooltip
        self.statusitem.setToolTip_('Safe Deposit Box 0.1\n(Yay! Values in Technology =)')

        self._build_menu(sender)

        self.timer = NSTimer.alloc().initWithFireDate_interval_target_selector_userInfo_repeats_(start_time, 1.0, self, 'tick:', None, True)
        NSRunLoop.currentRunLoop().addTimer_forMode_(self.timer, NSDefaultRunLoopMode)
        self.timer.fire()

    def tick_(self, notification):
        self.counter += 1
        self._build_menu(self.counter)
        print "We ticked!", self.counter

    def openfolder_(self, notification):
        print "open folder"

    def launchsite_(self, notification):
        print "launch browser for our website"

    def preferences_(self, notification):
        print "preferences menu"

    def help_(self, notification):
        print "help menu"

    def _build_menu(self, notification):
        self.menu = NSMenu.alloc().init()

        menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Open SafeDepositBox Folder', 'openfolder:', '')
        self.menu.addItem_(menuitem)

        menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Launch SafeDepositBox Website', 'launchsite:', '')
        self.menu.addItem_(menuitem)

        menuitem = NSMenuItem.separatorItem()
        self.menu.addItem_(menuitem)

        if type(1) == type(notification):
            menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('%s GB used on Amazon\'s S3' % str(3.14 + .01*float(notification)), '', '')
        else:
            menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Calculating usage...', '', '')
        self.menu.addItem_(menuitem)

        menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Estimated cost: $%s' % str("0.01"), '', '')
        self.menu.addItem_(menuitem)

        menuitem = NSMenuItem.separatorItem()
        self.menu.addItem_(menuitem)

        # Sync event is bound to sync_ method                                                                                                                                                            
        menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('All files up to date','','')
        self.menu.addItem_(menuitem)

        menuitem = NSMenuItem.separatorItem()
        self.menu.addItem_(menuitem)

        # Default event                                                                                                                                                                                  
        menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Quit', 'terminate:', '')
        self.menu.addItem_(menuitem)

        # Bind it to the status item                                                                                                                                                                     
        self.statusitem.setMenu_(self.menu)

