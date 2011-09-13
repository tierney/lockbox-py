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
    vcdiff TEXT,
    orig_size INT,
);

CREATE TABLE file_journal (
    id INTEGER PRIMARY KEY,
    server_path TEXT NOT NULL UNIQUE,
    known_server_path TEXT,
    known_blocklist TEXT,
    known_mtime INT,
    known_size INT,
    known_dir INT,
    known_root INT,
    known_attrs TEXT,
    updated_server_path TEXT,
    updated_blocklist TEXT,
    updated_mtime INT,
    updated_size INT,
    updated_dir INT,
    updated_attrs TEXT,
    plocal TINYINT,
    FOREIGN KEY(known_root) REFERENCES roots(id)
);

CREATE TABLE file_permission (
    user_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    permission INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES user(id),
    FOREIGN KEY(file_id) REFERENCES file_journal(id)
);

CREATE TABLE roots (
    id INTEGER PRIMARY KEY,
    filepath TEXT NOT NULL UNIQUE,
);