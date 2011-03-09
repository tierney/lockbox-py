import os
import sqlite3
import constants as C

init_statements = ["""
                   CREATE TABLE config (
                       id INTEGER PRIMARY KEY,
                       key TEXT NOT NULL UNIQUE,
                       value TEXT
                   );
                   """,
                   """
                   CREATE TABLE public_keys (
                       id INTEGER PRIMARY KEY,
                       user_id INTEGER NOT NULL,
                       location TEXT NOT NULL,
                       public_key TEXT NOT NULL,
                       FOREIGN KEY(user_id) REFERENCES user(id)
                   );
                   """,
                   """
                   CREATE INDEX public_keys_idx ON public_keys(user_id);
                   """,
                   """
                   CREATE TABLE user (
                       id INTEGER PRIMARY KEY,
                       email_address TEXT
                   );
                   """,
                   """
                   CREATE INDEX user_email_address_idx ON user(email_address);
                   """,
                   """
                   CREATE TABLE file_journal (
                       id INTEGER PRIMARY KEY,
                       filename TEXT,
                       server_path TEXT NOT NULL UNIQUE,
                       active_server_path TEXT,
                       active_mtime INT,
                       active_size INT,
                       active_md5 TEXT,
                       active_attrs TEXT,
                       updated_server_path TEXT,
                       updated_mtime INT,
                       updated_size INT,
                       updated_md5 TEXT,
                       updated_attrs TEXT,
                       on_disk TINYINT
                   );
                   """,
                   """
                   CREATE TABLE file_permission (
                       user_id INTEGER NOT NULL,
                       file_id INTEGER NOT NULL,
                       permission INTEGER NOT NULL,
                       FOREIGN KEY(user_id) REFERENCES user(id),
                       FOREIGN KEY(file_id) REFERENCES file_journal(id)
                   );
                   """]

class SDBSQLiteHelper:
    def __init__(self, admin_directory):
        self.db_path = os.path.join(admin_directory, C.SDB_DB_NAME)
        self.conn = sqlite3.connect(self.db_path)
        self.c = self.conn.cursor()

    def close(self):
        self.c.close()
    
    def _create_new_admin_db(self):
        for statement in init_statements:
            self.c.execute(statement)

    def create_file(self, filename):
        pass

    def _create_user(self, email):
        pass
    def _create_public_key(self, location, public_key):
        pass
    def create_user(self, email, location, public_key):
        pass

    def _delete_file_permission(self, email, filename):
        pass
    def _create_file_permission(self, email, filename, permission):
        pass

    def share_file(self, filename, email):
        # r = (SELECT id FROM user WHERE email_address = ?", email)
        # user_id = r[0]
        # r = (SELECT id FROM file_journal WHERE filename = ?", filename)
        # file_id = r[0]
        # ("INSERT INTO file_permission (user_id, file_id, permission) VALUES (?,?,3)",
        #       user_id, file_id
        pass
    def unshare_File(self, filename, email):
        pass
    
s = SDBSQLiteHelper(os.path.expanduser("~/.safedepositbox"))
s._create_new_admin_db()

