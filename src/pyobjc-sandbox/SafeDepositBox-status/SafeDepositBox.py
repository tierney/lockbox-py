import objc, re, os
from Foundation import *
from AppKit import *
from PyObjCTools import NibClassBuilder, AppHelper

status_images = {'sdb':'/Users/tierney/src/safe-deposit-box/bin/images/safe3.png',
                 'usb':'/Applications/iSync.app/Contents/Resources/usb.png'}
start_time = NSDate.date()

mytimer = 0
# from threading import Thread
# import time
# class SomeThread(Thread):
#   def __init__(self):
#     Thread.__init__(self)
  
#   def run(self):
#     global mytimer
#     while True:
#       print "Hello, World!", mytimer
#       mytimer += 1
#       time.sleep(1)

class StatusBar(NSObject):
  images = {}
  statusbar = None
  state = 'sdb'

  def applicationDidFinishLaunching_(self, notification):
    global mytimer
    statusbar = NSStatusBar.systemStatusBar()
    # Create the statusbar item
    self.statusitem = statusbar.statusItemWithLength_(NSVariableStatusItemLength)
    # Load all images
    for i in status_images.keys():
      self.images[i] = NSImage.alloc().initByReferencingFile_(status_images[i])
    # Set initial image
    self.statusitem.setImage_(self.images['sdb'])
    # Let it highlight upon clicking
    self.statusitem.setHighlightMode_(1)
    # Set a tooltip
    self.statusitem.setToolTip_('Sync Trigger')

    # Build a very simple menu
    self.menu = NSMenu.alloc().init()
    # Sync event is bound to sync_ method
    menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Sync...', 'sync:', '')
    self.menu.addItem_(menuitem)
    # Sync event is bound to sync_ method
    menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Network Progress (%d)' % mytimer,'','')
    self.menu.addItem_(menuitem)
    # Default event
    menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('Quit', 'terminate:', '')
    self.menu.addItem_(menuitem)
    # Bind it to the status item
    self.statusitem.setMenu_(self.menu)

    # Get the timer going
    self.timer = NSTimer.alloc().initWithFireDate_interval_target_selector_userInfo_repeats_(start_time, 5.0, self, 'tick:', None, True)
    NSRunLoop.currentRunLoop().addTimer_forMode_(self.timer, NSDefaultRunLoopMode)
    self.timer.fire()

  def sync_(self, notification):
    print "sync"

  def tick_(self, notification):
    print self.state

if __name__ == "__main__":
#   t = SomeThread()
#   t.daemon = True
#   t.start()
  app = NSApplication.sharedApplication()
  delegate = StatusBar.alloc().init()
  app.setDelegate_(delegate)
  AppHelper.runEventLoop()
