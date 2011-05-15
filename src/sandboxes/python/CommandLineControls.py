#!/usr/bin/env python

import readline
import cmd
import logging
import sys

prompt_string = "Lockbox"

class LockboxCommand(cmd.Cmd):
    def __init__(self):
        cmd.Cmd.__init__(self)
        self.prompt = prompt_string + '> '

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

    def do_add(self, s):
        l = s.split()
        if len(l) != 2:
           print "*** invalid number of arguments"
           return
        try:
           l = [int(i) for i in l]
        except ValueError:
           print "*** arguments should be numbers"
           return
        print l[0] + l[1]

def initialize_logging():
    FORMAT = "%(asctime)-15s %(levelname)-10s %(module)-10s %(lineno)-3d %(message)s"
    logging.basicConfig(filename="test.log", format=FORMAT)

def main():
    initialize_logging()
    log = logging.getLogger()
    log.warn("this is a warning")
    log.error("this is an error")
    cli = MyCommands()
    # cli = CLI()
    cli.cmdloop()

if __name__ == "__main__":
    main()
