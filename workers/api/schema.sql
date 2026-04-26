-- D1 Database Schema for Readrrr
-- Run this migration to set up the database schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    supabase_id TEXT NOT NULL UNIQUE,
    preferences TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content_url TEXT,
    word_count INTEGER DEFAULT 0,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bookmarks table (highlights/notes)
CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    text TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reading sessions table
CREATE TABLE IF NOT EXISTS reading_sessions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    words_read INTEGER DEFAULT 0,
    final_wpm INTEGER DEFAULT 300,
    progress REAL DEFAULT 0,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_document_id ON bookmarks(document_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_document_id ON reading_sessions(document_id);

-- Sync checkpoints table (optional, for advanced sync tracking)
CREATE TABLE IF NOT EXISTS sync_checkpoints (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_sequence INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Daily stats table (for analytics)
CREATE TABLE IF NOT EXISTS daily_stats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    words_read INTEGER DEFAULT 0,
    minutes_read INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Import jobs tracking table
CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'kindle', 'readwise', 'url'
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    payload TEXT, -- JSON string
    result TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    error_message TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
