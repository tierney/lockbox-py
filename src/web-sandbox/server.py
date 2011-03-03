#!/usr/bin/env python

import BaseHTTPServer
import urllib, urlparse, urllib2
import cgitb, mimetypes
import ConfigParser
import json
import getpass, os, platform, sys, socket, time

from string import Template

from os.path import basename, join, isfile, isdir, expanduser, split
shutdown_time = -1

class HTMLTemplate(Template):
  delimiter = '%'  

class ConfigHandler(BaseHTTPServer.BaseHTTPRequestHandler):
  def write(self, ctype, data, code=200):
    self.send_response(code)
    self.send_header('Content-Type', ctype)      
    self.end_headers()
    self.wfile.write(data)
  
  def send_content(self, path):
    mtype = mimetypes.guess_type('file://' + path)
    self.write(mtype[0], open('res' + path).read())
  

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
    
  def tmpl(self, path, q):
    path = q['template'][0]
    mtype = mimetypes.guess_type('file://' + path)
    ctmpl = HTMLTemplate(open('res' + path).read())
    
    content = ctmpl.substitute(dict(USER_EMAIL = '%s@%s' % (getpass.getuser(), socket.gethostname()),
                                    COMPUTER_NAME = '%s' % platform.node()))
    
    self.write(mtype[0], content)
  
  def configure(self, path, q):
    c = ConfigParser.ConfigParser()
    c.add_section('sdb')
    for key in ['name',
                 'userEmailAddress',
                 'userPassword',
                 'awsAccessKey',
                 'awsSecretKey',
                 'computerName',
                 'sdbDirectory']:
      c.set('sdb', key, q[key][0])
    
    admin_dir = os.path.join(os.environ["HOME"], ".safedepositbox")
    try:
      os.makedirs(admin_dir)
    except OSError, e:
      import errno
      if e[0] != errno.EEXIST:
        raise
    c.write(open(os.path.join(admin_dir, 'safedepositbox.conf'), 'w'))
    
    self.send_content('/success.html')
    
    # let this request out, then shutdown
    global shutdown_time 
    shutdown_time = time.time() + 3
    
  def do_GET(self):
    if self.path == '/':
      self.path = '/tmpl?template=/configure.html'

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
  def start_httpd():
    global httpd
    httpd = BaseHTTPServer.HTTPServer(('localhost', 8080), ConfigHandler)
    httpd.timeout = 1
    while 1:
      httpd.handle_request()
      if shutdown_time > 0:
        print 'Shutting down in: %.2f' % (shutdown_time - time.time())
        if time.time() > shutdown_time: 
          break
     
  import threading
  httpd_thread = threading.Thread(target = start_httpd)
  httpd_thread.setDaemon(True)  
  httpd_thread.start()
  
  import webbrowser
  webbrowser.open_new('http://localhost:8080')
   
  httpd_thread.join()
  
if __name__ == '__main__':
  configure()