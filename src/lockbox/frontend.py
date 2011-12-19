import LoggingHelper
LoggingHelper.LoggingHelper()

import json
import string
import logging
import random
import re
import web

from os.path import basename, join, isfile, isdir, expanduser, split
from sqlalchemy import orm
from sqlalchemy.orm import scoped_session, sessionmaker
from model import *


urls = (
  "/", "Index",
  "/view_group", "ViewGroup",
  '/new_user', 'NewUser',
  '/edit_user/(\d+)', 'EditUser',
  '/view_users', 'Users',
  '/new_fingerprint', 'NewFingerprint',
  '/new_group', 'NewGroup',
  '/edit_group/(\d+)', 'EditGroup',
  '/options', 'ChromeOptions',

  '/tree_json', 'TreeJson',
  '/conf', 'Configure',
  '/add_collection', 'AddCollection',
  '/get_collections', 'GetCollections',
  '/edit_collection/(\d+)', 'EditCollection',
  '/collection_collaborators', 'CollectionCollaborators',
  '/new_collaborator', 'NewCollaborator',
  '/get_collaborators', 'GetCollaborators',
  '/edit_membership', 'EditMembership',
)

render = web.template.render('templates')

menuitems = [('view_group', 'Groups'),
             ('new_user', 'New User'),
             ('view_users', 'View Users'),
             ('new_fingerprint', 'New Fingerprint')]

user_re = re.compile("user_(\d+)")
membership_re = re.compile("members_(\d+)")

class NewCollaborator:
  def POST(self):
    # TODO(tierney): We assume already-validated (by Javascript) input!!!
    # Security risk.
    input = web.input()
    web.header('Content-Type', 'application/json')

    user = User(name = input.name, cloud_credentials = input.email)
    web.ctx.orm.add(user)

    return json.dumps({'success': True})


class EditMembership:
  def POST(self):
    input = web.input()

    collection_id = input.collection
    checked_ids = json.loads(input.checked)
    updated_members_ids = [int(re.match(user_re, user_id).group(1))
                           for user_id in checked_ids]
    collection_id = re.match(membership_re, collection_id).group(1)

    users_to_collections = web.ctx.orm.query(UsersToCollections)\
        .filter(UsersToCollections.collections_id == collection_id)\
        .all()
    current_members_ids = [member.users_id for member in users_to_collections]
    users = web.ctx.orm.query(User).all()

    for user in users:
      # If we were not a member and now are labeled as such, add the
      # association.
      if user.id not in current_members_ids and user.id in updated_members_ids:
        new_member = UsersToCollections(users_id = user.id,
                                        collections_id = collection_id)
        web.ctx.orm.add(new_member)
        continue

      # If user was a member but is not longered labeled so, remove the
      # association.
      if user.id in current_members_ids and user.id not in updated_members_ids:
        web.ctx.orm.query(UsersToCollections).filter(
          UsersToCollections.users_id == user.id and
          UsersToCollections.collections_id == collection_id).delete()
        continue


class GetCollaborators:
  def GET(self):
    input = web.input()
    web.header('Content-Type', 'application/json')
    users = web.ctx.orm.query(User).all()
    ret = """ <table width=100% id="users" class="ui-widget ui-widget-content">
                <thead>
                  <tr class="ui-widget-header">
                    <th>Name</th>
                    <th>Email</th>
                    <th>Fingerprints</th>
                  </tr>
                </thead>
                <tbody>"""
    ret += "".join("<tr><td>%s</td><td>%s</td><td>%s</td></tr> " %\
                     (user.name, user.cloud_credentials, user.cloud_credentials)
                   for user in users)
    ret += """                </tbody>
              </table>"""
    return ret


class CollectionCollaborators:
  def POST(self):
    input = web.input()
    web.header('Content-Type', 'application/json')
    collection = web.ctx.orm.query(Collection).\
        filter(Collection.id == input.id).one()
    members = [collaborator.name for collaborator in collection.collaborators]
    users = web.ctx.orm.query(User).all()
    names = [user.name for user in users]
    ids = [user.id for user in users]

    pmembers = []
    for name in names:
      if name in members:
        pmembers.append(True)
      else:
        pmembers.append(False)

    success = None
    # if not collection:
    #   success = False
    success = True

    ret = """<form id="members_%d" action="edit_membership">""" % (int(input.id))
    for i, name in enumerate(names):
      if pmembers[i]:
        ret += """<input type="checkbox" name="user_%d" value="user_%d" checked=%s" />%s<br />""" % (ids[i], ids[i], "True", name)
      else:
        ret += """<input type="checkbox" name="user_%d" value="user_%d" />%s<br />""" % (ids[i], ids[i], name)
    ret += "</form>"

    return json.dumps({'collaborators': names,
                       'pmembers': pmembers,
                       'markup': ret,
                       'success': success})


class AddCollection:
  def GET(self):
    assert False

  def POST(self):
    input = web.input()
    web.header('Content-Type', 'application/json')
    print "AddCollection input:", input

    if 'path' in input:
      path = input.path
      collection = Collection(path = path)
      web.ctx.orm.add(collection)
      saved = True
      message = ""
    else:
      path = None
      saved = False
      message = "Houston, we had a problem."

    return json.dumps({
        'saved': saved,
        'added_collection': path,
        'message': message,
        })


class EditCollection:
  def POST(self, id):
    pass


class GetCollections:
  def GET(self):
    collections = web.ctx.orm.query(Collection).all()
    ret = ""
    ret += "".join(["<div data-id=%d data-name=\"%s\"><a href=\"#\" id=\"edit_collection_%d\">%s</a></div>" % \
                      (id+1, collection.path, id+1, collection.path) for id, collection in enumerate(collections)])
    ret += ""
    return ret


class Index:
  def GET(self):
    return render.options_page()


class Configure:
  def GET(self):
    return render.configure()

class Prototype:
  def GET(self):
    return render.prototype()


class ChromeOptions:
  def GET(self):
    return render.base(render.chrome_options(''))


class Template:
  def GET(self, path, q):
    path = q['template'][0]
    path = './' + path[1:]
    mtype = mimetypes.guess_type('file://' + path)
    ctmpl = HTMLTemplate(open(join(RESOURCE_DIR, path)).read())

    content = ctmpl.substitute(dict(USER_EMAIL = '%s@%s' % (getpass.getuser(), socket.gethostname()),
                                    COMPUTER_NAME = '%s' % platform.node()))

    return content


class TreeJson:
  def GET(self):
    path = web.input().get('path')
    d = expanduser(path)
    children = []
    for f in sorted(os.listdir(d)):
      # Include directories but not '.' directories.
      if isdir(join(d, f)) and not f.startswith('.'):
        children.append(dict(data = f, attr = {"path" : join(d, f)},
                             state = "closed", children = []))
    if d != '~':
      out = children
    else:
      out = [dict(data = split(d)[1], attr = {"path" : d}, state = 'open',
                  children = children)]

    return json.dumps(out, indent = 2)


class ViewGroup:
  def GET(self):
    new_group_form = web.form.Form(
      web.form.Textbox('name', web.form.notnull, size = 30,
                       description = ''),
      web.form.Button('Create group'))

    groups = web.ctx.orm.query(Group).all()
    return render.base(
      render.menu('view_group', menuitems),
      render.index(new_group_form,
                   sorted(groups, lambda x,y: cmp(x.name, y.name))))


class Users:
  def GET(self):
    users = web.ctx.orm.query(User).all()
    return render.base(
      render.menu('view_users', menuitems),
      render.view_users(sorted(users, lambda x,y : cmp(x.name, y.name))))


class NewFingerprint:
  form = web.form.Form(
    web.form.Textbox('key', web.form.notnull, size = 30,
                     value = 'key fingerprint',
                     description = 'Key Fingerprint:'),
    web.form.Textbox('user_id', web.form.notnull, size = 30,
                     descrpition = 'User ID:'),
    web.form.Button('Create Fingerprint')
    )


  def GET(self):
    form = self.form()
    return render.new(form, '')


  def POST(self):
    form = self.form()
    if not form.validates():
      return render.new(form)
    f = Fingerprint(key = form.d.key, user_id = form.d.user_id)
    web.ctx.orm.add(f)

    i = ViewGroup()
    return i.GET()


class NewUser:
  form = web.form.Form(
    web.form.Textbox('name', web.form.notnull, size = 30,
                     description = 'Name:'),
    web.form.Textbox('cloud_credentials', web.form.notnull, size = 30,
                     value = 'aws,aws_access_key_id,aws_secret_access_key',
                     description = 'Cloud Credentials:'),
    web.form.Textbox('fingerprint', web.form.notnull, size = 30,
                     description = 'Public Key Fingerprint:'),
    web.form.Button('Create user.'),
    )


  def GET(self):
    form = self.form()
    return render.base(
      render.menu('new_user', menuitems),
      render.new(form, ''))


  def POST(self):
    form = self.form()
    if not form.validates():
      return render.new(form, 'Invalid submission.')
    if web.ctx.orm.query(User).filter(User.name == form.d.name).all():
      return render.new(form, 'User\'s name already in database.')

    # Create and add user object to the database.
    u = User(name = form.d.name, cloud_credentials = form.d.cloud_credentials)
    web.ctx.orm.add(u)

    users = web.ctx.orm.query(User).all()
    return render.view_users(users)


class EditUser:
  def _set_groups(self):
    self.groups = web.ctx.orm.query(Group).all()
    return


  def _set_current_groups(self, id):
    self.current_groups = web.ctx.orm.query(UsersToGroups)\
      .filter(UsersToGroups.users_id == id)\
      .all()
    return


  def _render_form(self, id):
    user = web.ctx.orm.query(User).filter(User.id == id).one()
    self._set_groups()
    self._set_current_groups(id)

    group_ids_for_user = [user_group.groups_id for user_group
                          in self.current_groups]

    group_checkboxes = list()
    for group in self.groups:
      if group.id in group_ids_for_user:
        group_checkboxes.append(
          web.form.Checkbox(group.name, checked = True, value = group.id))
      else:
        group_checkboxes.append(
          web.form.Checkbox(group.name, checked = False, value = group.id))

    form_elements = group_checkboxes + [ web.form.Button('Save Changes') ]
    form_elements = [ web.form.Textbox('name', web.form.notnull, size = 30,
                                       description = 'User Name:',
                                       value = user.name) ] + form_elements
    return web.form.Form(*form_elements)


  def GET(self, id):
    form = self._render_form(id)
    return render.base(render.menu('edit_user', menuitems),
                       render.edit_user(form))


  def POST(self, id):
    form = self._render_form(id)
    if not form.validates():
      return render.edit_user(form)

    self._set_groups()
    self._set_current_groups(id)
    group_ids_for_user = [user_group.groups_id for user_group
                          in self.current_groups]
    for group in self.groups:
      if group.id not in group_ids_for_user and form.d.get(group.name):
        user_to_group = UsersToGroups(users_id = id, groups_id = group.id)
        web.ctx.orm.add(user_to_group)
        continue

      if group.id in self.current_groups and not form.d.get(group.name):
        web.ctx.orm.query(UsersToGroups).filter(
          UsersToGroups.users_id == id and UsersToGroups.groups_id == group.id)\
          .delete()
        continue

    return render.base(render.menu('edit_user', menuitems),
                       render.edit_user(form))


class EditGroup:
  def GET(self, id):
    users = web.ctx.orm.query(User).all()
    current_members = web.ctx.orm.query(UsersToGroups)\
        .filter(UsersToGroups.groups_id == id)\
        .all()
    user_ids_in_group = [user_group.users_id for user_group in current_members]

    user_checkboxes = list()
    for user in users:
      if user.id in user_ids_in_group:
        user_checkboxes.append(
          web.form.Checkbox(user.name, checked = True, value = user.id))
      else:
        user_checkboxes.append(
          web.form.Checkbox(user.name, checked = False, value = user.id))

    form_elements = user_checkboxes + [ web.form.Button('Save Changes') ]
    form = web.form.Form(*form_elements)

    group = web.ctx.orm.query(Group).filter(Group.id == id).one()
    return render.base(render.menu('edit_group', menuitems),
                       render.edit_group(group.name, form, ''))


  def POST(self, id):
    logging.info('Group id : %s.' % str(id))

    users = web.ctx.orm.query(User).all()
    current_users_groups = web.ctx.orm.query(UsersToGroups)\
        .filter(UsersToGroups.groups_id == id)\
        .all()
    current_users = [user_group.users_id for user_group in current_users_groups]
    user_checkboxes = [web.form.Checkbox(user.name, value = user.id)
                       for user in users]
    form_elements = user_checkboxes + [ web.form.Button('Save Changes') ]
    form = web.form.Form(*form_elements)

    if not form.validates():
      return render.edit_group(form, 'Invalid form submission.')

    for user in users:
      logging.info('Checkbox %s : %s.' % (user.name, form.d.get(user.name)))
      # If we were not a member and now are labeled as such, add the
      # association.
      if user.id not in current_users and form.d.get(user.name):
        user_to_group = UsersToGroups(users_id = user.id, groups_id = id)
        web.ctx.orm.add(user_to_group)
        continue

      # If user was a member but is not longered labeled so, remove the
      # association.
      if user.id in current_users and not form.d.get(user.name):
        web.ctx.orm.query(UsersToGroups).filter(
          UsersToGroups.users_id == user.id and UsersToGroups.groups_id == id)\
          .delete()
        logging.info('Should have deleted the user and group association.')
        continue

    group = web.ctx.orm.query(Group).filter(Group.id == id).one()
    return render.base(render.menu('edit_group', menuitems),
                      render.edit_group(group.name, form, 'Saved changes.'))


class NewGroup:
  form = web.form.Form(
    web.form.Textbox('name', web.form.notnull, size = 30,
                     description = 'Group Name:'),
    web.form.Button('Create group')
    )

  def GET(self):
    form = self.form()
    return render.new_group(form, '')

  def POST(self):
    form = self.form()
    if not form.validates():
      return render.new_group(form, 'Problem with Group.')

    g = Group(name = form.d.name)
    web.ctx.orm.add(g)

    # Return to the homepage.
    i = ViewGroup()
    return i.GET()


def load_sqla(handler):
  web.ctx.orm = scoped_session(sessionmaker(bind=engine))
  try:
    return handler()
  except web.HTTPError:
     web.ctx.orm.commit()
     raise
  except:
    web.ctx.orm.rollback()
    raise
  finally:
    web.ctx.orm.commit()
    # If the above alone doesn't work, uncomment
    # the following line:
    # web.ctx.orm.expunge_all()


web.config.debug = True
app = web.application(urls, globals())
app.add_processor(load_sqla)

if __name__ == "__main__":
  import webbrowser, multiprocessing
  multiprocessing.Process(target=app.run).start()
  webbrowser.open_new_tab("http://0.0.0.0:8080")
