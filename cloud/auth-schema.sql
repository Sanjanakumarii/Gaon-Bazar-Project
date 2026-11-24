CREATE TABLE cloud_users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password TEXT NOT NULL);
CREATE TABLE cloud_sessions (token TEXT PRIMARY KEY,user TEXT NOT NULL REFERENCES cloud_users(id),expires INTEGER NOT NULL);
CREATE INDEX cloud_sessions_expiry ON cloud_sessions(expires);
CREATE TABLE cloud_attempts (id TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
