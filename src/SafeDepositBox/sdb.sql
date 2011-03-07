CREATE TABLE block_cache (
    id INTEGER PRIMARY KEY,
    hash VARCHAR(43) NOT NULL UNIQUE,
    sig TEXT,
    size INT,
    delete_after INT,
    needed_for INT
);
CREATE TABLE config (
    id INTEGER PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT
);

-- 

CREATE TABLE file_journal (
    id INTEGER PRIMARY KEY,
    server_path TEXT NOT NULL UNIQUE,
    active_server_path TEXT,
    active_blocklist TEXT,
    active_mtime INT,
    active_size INT,
    active_sjid INT UNIQUE,
    active_dir INT,
    active_attrs TEXT,
    updated_server_path TEXT,
    updated_blocklist TEXT,
    updated_mtime INT,
    updated_size INT,
    updated_sjid INT,
    updated_dir INT,
    updated_attrs TEXT,
    on_disk TINYINT
);
