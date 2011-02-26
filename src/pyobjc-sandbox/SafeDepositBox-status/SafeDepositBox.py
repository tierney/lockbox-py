import objc, re, os
from Foundation import *
from AppKit import *
from PyObjCTools import NibClassBuilder, AppHelper

status_images = {'sdb':'safe3.png'}
start_time = NSDate.date()

class StatusBar(NSObject):
  images = {}
  statusbar = None
  state = 'sdb'

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

    menuitem = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('%s GB used on Amazon\'s S3' % str("3.14"), '', '')
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

  def applicationDidFinishLaunching_(self, notification):
    self.counter = 0
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
    self._build_menu(notification)

    # Get the timer going
    self.timer = NSTimer.alloc().initWithFireDate_interval_target_selector_userInfo_repeats_(start_time, 1.0, self, 'tick:', None, True)
    NSRunLoop.currentRunLoop().addTimer_forMode_(self.timer, NSDefaultRunLoopMode)
    self.timer.fire()

  def sync_(self, notification):
    print "sync"

  def tick_(self, notification):
    self.counter += 1
    self._build_menu(self.counter)
    print self.state

if __name__ == "__main__":
  app = NSApplication.sharedApplication()
  delegate = StatusBar.alloc().init()
  app.setDelegate_(delegate)
  AppHelper.runEventLoop()
