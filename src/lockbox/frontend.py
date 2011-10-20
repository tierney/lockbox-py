'''
Created on Oct 19, 2011

@author: tierney
'''

import web

urls = ('/(.*)', 'index'
        )

app = web.application(urls, globals())

class index:
  def GET(self, name):
    if name:
      return "<html><em>hello</em>, %s</html>" % (name)
    return "<html><em>hello</em>, world</html>"

if __name__ == '__main__':
  app.run()
