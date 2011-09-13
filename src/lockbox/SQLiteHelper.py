import os
import sqlite3
import constants as C

SQL_SCHEMA = 'SDB.sql'

class SQLiteHelper:
    def __init__(self, admin_directory, reset=False):
        self.db_path = os.path.join(admin_directory, C.SDB_DB_NAME)
        if reset:
            if os.path.exists(self.db_path):
                os.remove(self.db_path)
        self._initialize_db()

    def _initialize_db(self):
        if not os.path.exists(self.db_path):
            self._create_new_admin_db()

    def _get_init_script(self):
        return "".join(open(SQL_SCHEMA).readlines())

    def _create_new_admin_db(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.executescript(self._get_init_script())
        conn.commit()
        conn.close()

    def get_config(self):
        ret_dict = dict()
        for conf_item in ['staging_directory',
                          'aws_access_key',
                          'aws_secret_key',
                          'sdb_directory',
                          'email_address',
                          'computer_name',
                          'public_key',
                          'private_key']:
            ret_dict[conf_item] = self.config_get(conf_item)        
        return ret_dict
    
    def config_get(self, key):
        conn = sqlite3.connect(self.db_path)
        ret = None
        with conn:
            rows = conn.execute("SELECT value FROM config WHERE key = ?", (key,))
            r = rows.fetchone()
            if r: ret = r[0]
        conn.close()
        return ret

    def config_set(self, key, value):
        conn = sqlite3.connect(self.db_path)
        with conn:
            conn.execute("REPLACE INTO config (key, value) VALUES (?,?)", (key, value))
            conn.commit()
        conn.close()

    def set_priv_key_pem(self, priv):
        """Expects PEM (base64 string) version of a private key"""
        self.config_set('private_key', priv)

    def get_priv_key_pem(self):
        """Returns PEM version of a private key"""
        return self.config_get('private_key')

    def create_file(self, **kwargs):
        pass

    def update_file(self, **kwargs):
        pass

    def insert_user_loc_key(self, email, location, public_key):
        conn = sqlite3.connect(self.db_path)
        with conn:
            conn.execute("INSERT OR IGNORE INTO user (email_address) VALUES (?)", (email,))
            conn.execute("""INSERT INTO public_keys (user_id, location, public_key) VALUES
                              ((SELECT id FROM user WHERE email_address = ?), ?, ?)""", (email, location, public_key))
            conn.commit()
        conn.close()

    def share_file(self, server_path, email):
        conn = sqlite3.connect(self.db_path)
        with conn:
            conn.execute("""INSERT INTO file_permission (user_id, file_id, permission) VALUES
                               ((SELECT id FROM user WHERE email_address = ?),
                                (SELECT id FROM file_journal WHERE server_path = ?),
                                3)""", (email, server_path))
            conn.commit()
        conn.close()

    def unshare_file(self, server_path, email):
        conn = sqlite3.connect(self.db_path)
        with conn:
            conn.execute("""DELETE FROM file_permission WHERE
                                user_id = (SELECT id FROM user WHERE email_address = ?) AND
                                file_id = (SELECT id FROM file_journal WHERE server_path = ?)""", (email, server_path))
            conn.commit()
        conn.close()
        
def test_reset():
    s = SDBSQLiteHelper(os.path.expanduser("~/.safedepositbox"), reset=True)
    p = s.config_get('password')
    assert (p == None)

def test_set_and_get():
    s = SDBSQLiteHelper(os.path.expanduser("~/.safedepositbox"), reset=True)
    key = 'keypassword'
    value = 'valpassword'
    s.config_set(key, value)
    p = s.config_get(key)
    assert (p == value)

def test_set_and_get_priv_pem():
    s = SDBSQLiteHelper(os.path.expanduser("~/.safedepositbox"), reset=True)
    priv = 'somelongstringrepresentingapemversionofanrsaprivatekey'
    s.set_priv_key_pem(priv)
    p = s.get_priv_key_pem()
    assert (p == priv)

def test_insert_user_loc_key_insert_only():
    s = SDBSQLiteHelper(os.path.expanduser("~/.safedepositbox"), reset=True)
    s.insert_user_loc_key("tierney@cs.nyu.edu","Macbook Pro", "somethingthatissupposedtorepresentapublickey")
