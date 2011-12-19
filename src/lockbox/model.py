import os
import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship, backref

engine = create_engine('sqlite:////tmp/mydatabase.db', echo=True)

from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class UsersToGroups(Base):
  __tablename__ = 'users_groups'

  id = Column(Integer, primary_key = True)
  users_id = Column(Integer, ForeignKey('users.id'))
  groups_id = Column(Integer, ForeignKey('groups.id'))
  updated = Column(Boolean)


users_groups_table = UsersToGroups.__table__

class UsersToCollections(Base):
  __tablename__ = 'users_collections'
  id = Column(Integer, primary_key = True)
  users_id = Column(Integer, ForeignKey('users.id'))
  collections_id = Column(Integer, ForeignKey('collections.id'))
  updated = Column(Boolean)


users_collections_table = UsersToCollections.__table__

class Fingerprint(Base):
  __tablename__ = 'fingerprints'

  id = Column(Integer, primary_key = True)
  key = Column(String)
  user_id = Column(Integer, ForeignKey('users.id'))
  updated = Column(Boolean)


class User(Base):
  __tablename__ = 'users'

  id = Column(Integer, primary_key = True)
  name = Column(String, unique = True)
  cloud_credentials = Column(String)
  aws_access_key_id = Column(String)
  aws_secret_access_key = Column(String)
  fingerprints = relationship(Fingerprint)
  updated = Column(Boolean)


class Group(Base):
  __tablename__ = 'groups'

  id = Column(Integer, primary_key = True)
  name = Column(String, unique = True)
  directory = Column(String)
  users = relationship(User, secondary=users_groups_table, backref='groups')
  updated = Column(Boolean)


class Collection(Base):
  __tablename__ = 'collections'

  id = Column(Integer, primary_key = True)
  path = Column(String, unique = True)
  collaborators = relationship(User, secondary=users_collections_table,
                               backref='collections')
  update = Column(Boolean)


class Credential(Base):
  __tablename__ = 'credentials'

  id = Column(Integer, primary_key = True)
  group = relationship(Group)
  region = Column(String)
  namespace = Column(String)
  aws_access_key_id = Column(String)
  aws_secret_access_key = Column(String)
  permissions = Column(String)


class Metadata(Base):
  __tablename__ = 'metadata'

  key = Column(String, primary_key = True)
  value = Column(String)


class Workqueue(Base):
  __tablename__ = 'workqueue'

  id = Column(String, primary_key = True)
  timestamp = Column(DateTime)
  state = Column(String)
  event_type = Column(String)
  src = Column(String)
  dest = Column(String)


fingerprint_table = Fingerprint.__table__
users_table = User.__table__
groups_table = Group.__table__
collection_table = Collection.__table__
credential_table = Credential.__table__

metadata = Base.metadata


if __name__ == "__main__":
  metadata.create_all(engine)
