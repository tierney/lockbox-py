#!/usr/bin/env python

import BaseHTTPServer
import urllib, urlparse, urllib2
import json
import os
from os.path import basename, join, isfile, isdir, expanduser, split
import cgitb
import mimetypes
import ConfigParser

class ConfigHandler(BaseHTTPServer.BaseHTTPRequestHandler):
  def write(self, ctype, data, code=200):
    self.send_response(code)
    self.send_header('Content-Type', ctype)      
    self.end_headers()
    self.wfile.write(data)
  
  def tree_json(self, path, q):
    d = expanduser(q['path'][0])
    children = []
    for f in sorted(os.listdir(d)):            
      if isdir(join(d, f)) and not f.startswith('.'):
        children.append(dict(data = f, attr = {"path" : join(d, f)}, state = "closed", children = []))

    if d != '~':
      out = children
    else:
      out = [dict(data = split(d)[1], attr = {"path" : d}, state = 'open', children = children)]      
    
    self.write('text/javascript', json.dumps(out, indent=2))
  
  def configure(self, path, q):
    c = ConfigParser.ConfigParser()
    c.add_section('sdb')
    for key in ['firstName',
                 'lastName',
                 'userEmailAddress',
                 'userPassword',
                 'awsAccessKey',
                 'awsSecretKey',
                 'computerName',
                 'sdbDirectory']:
      c.set('sdb', key, q[key][0])
    
    admin_dir = os.path.join(os.environ["HOME"], ".safedepositbox")
    os.makedirs(admin_dir)
    c.write(open(os.path.join(admin_dir, 'safedepositbox.conf'), 'w'))
    
    self.send_content('success.html')
    
  def send_content(self):
    mtype = mimetypes.guess_type('file://' + path)
    self.write(mtype[0], open('res' + path).read())
  
  def do_GET(self):
    if self.path == '/':
      self.path = '/configure.html'

    url = urlparse.urlsplit(self.path, scheme='http')
    path = url.path
    q = urlparse.parse_qs(url.query)

    if isfile('res' + path):
      self.send_content(path)
      return
          
    f = getattr(self, path[1:], None)
    if not f:
      self.send_error(404, 'Missing resource "%s"' % path[1:])
    else:
      try:
        f(path, q)
      except:
        import cStringIO
        f = cStringIO.StringIO()
        cgitb.Hook(file=f).handle()
        self.write('text/html', f.getvalue(), code=500)
            

def configure():
  httpd = BaseHTTPServer.HTTPServer(('localhost', 8080), ConfigHandler)
  httpd.serve_forever(poll_interval=0.1)
  
  
if __name__ == '__main__':
  configure()