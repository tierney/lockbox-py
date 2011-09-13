#!/usr/bin/env python

import boto

conn = boto.connect_sdb("AKIAJUHIZBILIEB4IOVA", "JpgOeEjrOC2q9Qf2XuLxrAZnW2iQ0rk762EGAzXv")
try:
    domain = conn.get_domain('sdb')
except SDBResponseError:
    domain = conn.create_domain('sdb')

data = {}
data['some-item'] = {'color':'blue','price':10,'size':'small'}
data['some-other-item'] = {'color':'red','price':15,'size':'medium'}
data['bicolored'] = {'color':['blue','green'],'price':15,'size':'small'}
data['tricolored'] = {'color':['red','blue','green'],'price':20,'size':'medium'}
data['nocolor'] = {'price':10,'size':'small'}
data['another-color'] = {'color':'purple','price':5,'size':'tiny',
                         'comment':'This one is really small'}

# Insert the items
for name,d in data.items():
    item = domain.new_item(name)
    for k,v in d.items():
        item[k] = v
    item.save()

# inode numbers are unique per filesystem. bundle the computer name
# and the filesystem (computer-name, inode) represents equivalent
# across different machines

#
# checkpoints
# deltas
# rsync checksums, hashes
# 

