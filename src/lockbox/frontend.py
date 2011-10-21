'''
Created on Oct 19, 2011

@author: tierney
'''

import web

urls = ('/(.*)', 'index'
        )

render = web.template.render('templates/')
app = web.application(urls, globals())

class index:
  def GET(self, name):
    groups = {'wire' : ['aditya', 'lakshmi', 'jinyang'],
              'lockbox' : ['power', 'lakshmi', 'jinyang'],
              }
    print groups
    return render.index(name, groups)


if __name__ == '__main__':
  app.run()
