import sqlite3
import constants as C

class SDBSQLiteHelper:
    def __init__(self, admin_directory):
        self.db_path = os.path.join(admin_directory, C.SDB_DB_NAME)
        self.conn = sqlite3.connect(db_path)
        self.c = self.conn.cursor()

    def close(self):
        self.c.close()
    
    def _create_new_admin_db(self):
        self.c.execute("""
CREATE TABLE config (
    id INTEGER PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT
);
""")

        self.c.execute("""
CREATE TABLE file
""")
    
