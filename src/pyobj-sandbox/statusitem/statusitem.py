#!/usr/bin/env python

import objc
from Foundation import *
from AppKit import *
from PyObjCTools import NibClassBuilder, AppHelper

start_time = NSDate.date()

class Timer(NSObject):
     '''
     Application delegate
     '''
     statusbar = None

     def applicationDidFinishLaunching_(self, notification):
         print 'timer launched'
         # Make the statusbar item
         statusbar = NSStatusBar.systemStatusBar()
         # if you use an icon, the length can be NSSquareStatusItemLength
         statusitem = statusbar.statusItemWithLength_(NSVariableStatusItemLength)
         self.statusitem = statusitem  # Need to retain this for later
         # statusitem.setImage_(some_image)
         #statusitem.setMenu_(some_menu)
         statusitem.setToolTip_('Seconds since startup')
         statusitem.setAction_('terminate:') # must have some way to exit
         self.timer =  NSTimer.alloc().initWithFireDate_interval_target_selector_userInfo_repeats_(
              start_time,
              1.0,
              self,
              'display:',
              None,
              True
              )
         NSRunLoop.currentRunLoop().addTimer_forMode_(self.timer, NSDefaultRunLoopMode)
         self.timer.fire()

     def display_(self, notification):
         print 'display:'
         self.statusitem.setTitle_(elapsed())

def elapsed():
     return str(int(NSDate.date().timeIntervalSinceDate_(start_time)))

if __name__ == "__main__":
     app = NSApplication.sharedApplication()
     delegate = Timer.alloc().init()
     app.setDelegate_(delegate)
     AppHelper.runEventLoop()
