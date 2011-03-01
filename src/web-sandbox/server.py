#!/usr/bin/env python

import BaseHTTPServer
import urllib, urlparse, urllib2
import json
import os
from os.path import basename, join, isfile, isdir, expanduser, split
import mimetypes

class ConfigHandler(BaseHTTPServer.BaseHTTPRequestHandler):
  def write(self, ctype, data):
    self.send_response(200)
    self.send_header('Content-Type', ctype)      
    self.end_headers()
    self.wfile.write(data)
    
  def do_GET(self):
    if self.path == '/':
      self.path = '/configure.html'

    url = urlparse.urlsplit(self.path, scheme='http')
    path = url.path
    q = urlparse.parse_qs(url.query)
      
    if path == '/tree.json':
      d = expanduser(q['path'][0])
      children = []
      try:
          for f in sorted(os.listdir(d)):            
            if isdir(join(d, f)) and not f.startswith('.'):
              children.append(dict(data = f, attr = {"path" : join(d, f)}, state = "closed", children = []))
      except OSError, e:
        pass        

      if d != '~':
        out = children
      else:
        out = [dict(data = split(d)[1], attr = {"path" : d}, state = 'open', children = children)]
      
      self.write('text/javascript', json.dumps(out, indent=2))    
    elif isfile('res' + path):
      mtype = mimetypes.guess_type('file://' + path)
      self.write(mtype[0], open('res' + path).read())      
    else:
      self.send_error(404)      

def configure():
  httpd = BaseHTTPServer.HTTPServer(('localhost', 8080), ConfigHandler)
  httpd.serve_forever(poll_interval=0.1)
  
  
if __name__ == '__main__':
  configure()