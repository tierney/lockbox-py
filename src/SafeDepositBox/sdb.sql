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
    email_address TEXT
);
CREATE INDEX user_email_address_idx ON user(email_address);

CREATE TABLE block_cache (
    id INTEGER PRIMARY KEY,
    hash VARCHAR(43) NOT NULL UNIQUE,
    sig TEXT,
    size INT,
    delete_after INT,
    needed_for INT
);

CREATE TABLE file_journal (
    id INTEGER PRIMARY KEY,
    server_path TEXT NOT NULL UNIQUE,
    active_server_path TEXT,
    active_blocklist TEXT,
    active_mtime INT,
    active_size INT,
    active_dir INT,
    active_attrs TEXT,
    updated_server_path TEXT,
    updated_blocklist TEXT,
    updated_mtime INT,
    updated_size INT,
    updated_dir INT,
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
