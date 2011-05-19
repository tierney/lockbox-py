#!/usr/bin/env python

import readline
import cmd
import logging
import sys

class LockboxCommands(cmd.Cmd):
    def __init__(self):
        cmd.Cmd.__init__(self)
        self.prompt = 'Lockbox > '

    def do_viewlog(self): pass        

    # local credentials    
    def do_updateawsaccesskey(self): pass
    
    def do_updateawssecretkey(self): pass
    
    # editors
    def do_addeditor(self):
        pass
    
    def do_deleditor(self):
        pass
    
    def do_modeditor(self):
        pass

    def do_searcheditors(self):
        # see address book
        pass
    
    # viewer
    def do_addviewer(self): pass
    def do_delviewer(self): pass
    def do_modviewer(self): pass
    def do_searchviewers(self): pass

    # keys
    def do_genkey(self):
        pass

    def do_addkey(self):
        """
        TODO username + location == key
        """
        pass
    
    def do_modkey(self):
        # change username or location associated with key
        pass
    
    def do_delkey(self):
        pass
    
    def do_lskeys(self):
        pass
    
    # Adjust association between editor and file
    def do_addeditortofile(self):
        # username
        pass

    def do_deleditorfromfile(self):
        pass

    def do_lsfileeditors(self, filename):
        pass
    
    # file manipulation
    def do_lsfiles(self):
        pass

    # top directory manipulation
    def do_lstopdirs(self):
        pass
    
    def do_addtopdir(self):
        pass
    
    def do_rmtopdir(self):
        pass
    
    # web service setup
    def do_cost(self):
        pass

    # Lockbox System testing
    def do_upgradecheck(self):
        pass

    def do_upgradestart(self):
        pass

    def do_quit(self, arg):
        sys.exit(1)

    def help_quit(self):
        print "syntax: quit",
        print "-- terminates the application"

    # shortcuts
    do_q = do_quit


