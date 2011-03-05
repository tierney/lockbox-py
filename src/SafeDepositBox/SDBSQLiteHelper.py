import sqlite3
import constants as C

class SDBSQLiteHelper:
    def __init__(self, admin_directory):
        db_path = os.path.join(admin_directory, C.SDB_DB_NAME)
        sqlite3.connect(db_path)
    
