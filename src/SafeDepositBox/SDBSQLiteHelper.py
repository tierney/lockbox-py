import os
import sqlite3
import constants as C

KEY = 1
VALUE = 2

init_script = """
              CREATE TABLE config (
                  id INTEGER PRIMARY KEY,
                  key TEXT NOT NULL UNIQUE,
                  value TEXT
              );
              CREATE TABLE public_keys (
                  id INTEGER PRIMARY KEY,
                  user_id INTEGER NOT NULL,
                  location TEXT NOT NULL,
                  public_key TEXT NOT NULL,
                  FOREIGN KEY(user_id) REFERENCES user(id)
              );
              CREATE INDEX public_keys_idx ON public_keys(user_id);
              CREATE TABLE user (
                  id INTEGER PRIMARY KEY,
                  email_address TEXT NOT NULL UNIQUE
              );
              CREATE INDEX user_email_address_idx ON user(email_address);
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
              CREATE TABLE file_permission (
                  user_id INTEGER NOT NULL,
                  file_id INTEGER NOT NULL,
                  permission INTEGER NOT NULL,
                  FOREIGN KEY(user_id) REFERENCES user(id),
                  FOREIGN KEY(file_id) REFERENCES file_journal(id)
              );
              """

class SDBSQLiteHelper:
    def __init__(self, admin_directory):
        self.db_path = os.path.join(admin_directory, C.SDB_DB_NAME)        
        self._initialize_db()

    def _initialize_db(self):
        if not os.path.exists(self.db_path):
            self._create_new_admin_db()

    def _create_new_admin_db(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.executescript(init_script)
        conn.commit()
        conn.close()

    def get_config(self):
        conn = sqlite3.connect(self.db_path)
        conf_dict = dict()
        with conn:
            rows = conn.execute("SELECT * FROM config")
            for row in rows:
                conf_dict[row[KEY]] = row[VALUE]
        conn.close()
        return conf_dict

    def create_file(self):
        pass

    def insert_user_loc_key(self, email, location, public_key):
        conn = sqlite3.connect(self.db_path)
        with conn:
            conn.execute("INSERT OR IGNORE INTO user (email_address) VALUES (?)", (email,))
            conn.execute("""INSERT INTO public_keys (user_id, location, public_key) VALUES
                              ((SELECT id FROM user WHERE email_address = ?), ?, ?)""",
                         (email, location, public_key))
        conn.close()
    def insert_local_keys(self, priv, pub):
        conn = sqlite3.connect(self.db_path)
        try:
            with conn:
                conn.execute("INSERT INTO config (key, value) VALUES ('private_key',?)", (priv,))
                conn.execute("INSERT INTO config (key, value) VALUES ('public_key',?)", (pub,))
        except sqlite3.IntegrityError:
            print "keys already exist"
        conn.close()
    def share_file(self, filename, email):
        conn = sqlite3.connect(self.db_path)
        with conn:
            conn.execute("""INSERT INTO file_permission (user_id, file_id, permission) VALUES
                               ((SELECT id FROM user WHERE email_address = ?),
                                (SELECT id FROM file_journal WHERE filename = ?),
                                3)""",
                         (email, filename))
        conn.close()
    def unshare_file(self, filename, email):
        conn = sqlite3.connect(self.db_path)
        with conn:
            conn.execute("""DELETE FROM file_permission WHERE
                                user_id = (SELECT id FROM user WHERE email_address = ?) AND
                                file_id = (SELECT id FROM file_journal WHERE filename = ?)""",
                         (email, filename))
        conn.close()

        
def test_sqlite_helper():
    s = SDBSQLiteHelper(os.path.expanduser("~/.safedepositbox"))
    s._create_new_admin_db()

