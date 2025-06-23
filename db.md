```
apt install sqlite3
sqlite3 messages.db
sqlite> .tables
telegram_channel_posts

sqlite> .schema telegram_channel_posts
CREATE TABLE telegram_channel_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                update_id INTEGER UNIQUE,
                chat_id INTEGER,
                message_id INTEGER,
                date TEXT,
                text TEXT,
                caption TEXT,
                file_id TEXT,
                file_type TEXT,
                full_json TEXT
            );
sqlite> .q
```
