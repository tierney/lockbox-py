#!/usr/bin/env python
"""Accountant class keeps track of an estimate of how much we are spending to
use the clous service provider."""

__author__ == 'tierney@cs.nyu.edu (Matt Tierney)'

from threading import Thread

class Accountant(Thread):
  def __init__(self):
    Thread.__init__(self)


if __name__=='__main__':
  Accountant()

