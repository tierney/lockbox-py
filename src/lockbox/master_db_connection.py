#!/usr/bin/env python

import sqlite3

class MasterDBConnection():
  def __init__(self, database):
    self.database = database
    self.dbcon = None


  def __enter__(self):
    self.dbcon = sqlite3.connect(database=self.database,
                                 detect_types=sqlite3.PARSE_DECLTYPES)
    self.dbcon.row_factory = sqlite3.dbapi2.Row
    return self.dbcon.cursor()


  def __exit__(self, type, value, tb):
    if tb is None:
      self.dbcon.commit()
      self.dbcon.close()
      self.dbcon = None
    else:
      self.dbcon.rollback()
      self.dbcon.close()
      self.dbcon = None
