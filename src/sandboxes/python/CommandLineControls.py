#!/usr/bin/env python

import readline
import cmd
import logging
import sys

prompt_string = "Lockbox"

class MyCommands(cmd.Cmd):
    def __init__(self):
        cmd.Cmd.__init__(self)
        self.prompt = prompt_string+'> '

    def do_hello(self, arg):
        print "hello again", arg, "!"

    def help_hello(self):
        print "syntax: hello [message]",
        print "-- prints a hello message"

    def do_quit(self, arg):
        sys.exit(1)

    def help_quit(self):
        print "syntax: quit",
        print "-- terminates the application"

    # shortcuts
    do_q = do_quit

    def do_add(self,s):
        l = s.split()
        if len(l)!=2:
           print "*** invalid number of arguments"
           return
        try:
           l = [int(i) for i in l]
        except ValueError:
           print "*** arguments should be numbers"
           return
        print l[0]+l[1]

def initialize_logging():
    FORMAT="%(asctime)-15s %(levelname)-10s %(module)-10s %(lineno)-3d %(message)s"
    logging.basicConfig(filename="test.log", format=FORMAT)

def main():
    initialize_logging()
    log = logging.getLogger()
    log.warn("this is a warning")
    log.error("this is an error")
    cli = MyCommands()
    # cli = CLI()
    cli.cmdloop()

if __name__=="__main__":
    main()
