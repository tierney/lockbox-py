#!/usr/bin/env python

import readline
import cmd
import logging
import sys

def not_implemented():
    print "Not implemented =("

class LockboxCommands(cmd.Cmd):
    def __init__(self):
        cmd.Cmd.__init__(self)
        self.prompt = 'Lockbox > '

    def do_viewlog(self, arg):
        not_implemented()   

    # local credentials    
    def do_updateawsaccesskey(self, arg):
        not_implemented()
    
    def do_updateawssecretkey(self, arg):
        not_implemented()
    
    # editors
    def do_addeditor(self, arg):
        not_implemented()
    
    def do_deleditor(self, arg):
        not_implemented()
    
    def do_modeditor(self, arg):
        not_implemented()

    def do_searcheditors(self, arg):
        # see address book
        not_implemented()
    
    # viewer
    def do_addviewer(self, arg):
        not_implemented()
        
    def do_delviewer(self, arg):
        not_implemented()
        
    def do_modviewer(self, arg):
        not_implemented()
        
    def do_searchviewers(self, arg):
        not_implemented()

    # keys
    def do_genkey(self, arg):
        not_implemented()

    def do_addkey(self, arg):
        """
        TODO username + location == key
        """
        not_implemented()
    
    def do_modkey(self, arg):
        # change username or location associated with key
        not_implemented()
    
    def do_delkey(self, arg):
        not_implemented()
    
    def do_lskeys(self, arg):
        not_implemented()
    
    # Adjust association between editor and file
    def do_addeditortofile(self, arg):
        # username
        not_implemented()

    def do_deleditorfromfile(self, arg):
        not_implemented()

    def do_lsfileeditors(self, filename):
        not_implemented()
    
    # file manipulation
    def do_lsfiles(self, arg):
        not_implemented()

    # top directory manipulation
    def do_lstopdirs(self, arg):
        not_implemented()
    
    def do_addtopdir(self, arg):
        not_implemented()
    
    def do_rmtopdir(self, arg):
        not_implemented()
    
    # web service setup
    def do_cost(self, arg):
        not_implemented()

    # Lockbox System testing
    def do_upgradecheck(self, arg):
        not_implemented()

    def do_upgradestart(self, arg):
        not_implemented()

    def do_quit(self, arg):
        sys.exit(1)

    def help_quit(self):
        print "syntax: quit",
        print "-- terminates the application"

    # shortcuts
    do_q = do_quit
