require('dotenv').config();
const express = require('express');
const axios = require('axios');
const Database = require('better-sqlite3'); // <-- Changed import
const path = require('path');
const fs = require('fs'); // For file system operations, like deleting the DB file for tests

// --- Configuration ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_BASE = process.env.WEBHOOK_BASE;
const ENDPOINT = process.env.ENDPOINT || '/foo';
const PORT = process.env.PORT || 3000;

const WEBHOOK_URL = `https://${WEBHOOK_BASE}${ENDPOINT}`;
const TELEGRAM_API_BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

if (!BOT_TOKEN || !WEBHOOK_BASE) {
    console.error("Error: BOT_TOKEN, WEBHOOK_BASE, or ENDPOINT is not set in .env file.");
    // In a production app, you might want to exit here. For testing, it might be handled differently.
    // process.exit(1);
}

// --- Initialize Express App ---
const app = express();
app.use(express.json());

// --- SQLite Database Setup ---
// We make DB_PATH accessible externally for testing purposes
const MSG_DB_PATH = path.resolve(__dirname, 'messages.db');
let db; // This will hold our better-sqlite3 database instance

// Function to initialize the database
function appInit(dbPath = MSG_DB_PATH) {
    try {
        // Open the database connection synchronously
        // Add { verbose: console.log } to print SQL queries
        db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });
        console.log(`SQLite database ${dbPath} connect Ok`);

        // Run the CREATE TABLE command synchronously
        db.exec(`
            CREATE TABLE IF NOT EXISTS telegram_channel_posts (
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
            )
        `);
        console.log("Table 'telegram_channel_posts' ready.");
    } catch (err) {
        console.error("Error initializing SQLite database:", err.message);
        throw err; // Re-throw to indicate a critical setup failure
    }
    // Set the Telegram webhook once. Skip in test.
    if (dbPath === MSG_DB_PATH) {
-       setTelegramWebhook();
    }
}

// Function to close the database connection
function closeDb() {
    if (db && db.open) { // Check if db exists and is open
        try {
            db.close(); // Close synchronously
            console.log('Closed the SQLite database connection.');
        } catch (err) {
            console.error("Error closing DB:", err.message);
            // In case of error, you might decide whether to re-throw or just log
        }
    }
}

// --- Helper function to save a message ---
function saveMessageToDb(update) { // No longer async, as better-sqlite3 is synchronous
    const fullJson = JSON.stringify(update);
  /*
    const channelPost = update.channel_post;
    const chat_id = channelPost.chat.id;
    const message_id = channelPost.message_id;
    const date = new Date(channelPost.date * 1000).toISOString();
    const text = channelPost.text || null;
    const caption = channelPost.caption || null;

    let file_id = null;
    let file_type = null;

    if (channelPost.photo) {
        file_id = channelPost.photo[channelPost.photo.length - 1].file_id;
        file_type = 'photo';
    } else if (channelPost.document) {
        file_id = channelPost.document.file_id;
        file_type = 'document';
    } else if (channelPost.video) {
        file_id = channelPost.video.file_id;
        file_type = 'video';
    } else if (channelPost.audio) {
        file_id = channelPost.audio.file_id;
        file_type = 'audio';
    }
  */
    const insertStmt = db.prepare(`
        INSERT INTO telegram_channel_posts (update_id, full_json)
        VALUES (?, ?)
    `);

    try {
        const info = insertStmt.run(update.update_id, fullJson);
        // console.log(`[DB SAVE] Message saved to DB with row ID: ${info.lastInsertRowid}`);
        return info.lastInsertRowid;
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed: telegram_channel_posts.update_id')) { // Specific error message for unique constraint
            // console.warn(`[DB SAVE] Duplicate update_id ${update.update_id} detected, skipping.`);
            return null; // Return null if it's a duplicate
        } else {
            console.error(`[DB SAVE] Error inserting into DB: ${err.message}`);
            throw err; // Re-throw other errors
        }
    }
}

function deleteMessageFromDb(updateId) {
    const deleteStmt = db.prepare(`DELETE FROM telegram_channel_posts WHERE update_id = ?`);
    try {
        const info = deleteStmt.run(updateId);
        // console.log(`[DB DELETE] Deleted ${info.changes} row(s) for update_id: ${updateId}`);
        return info.changes > 0; // Return true if at least one row was deleted
    } catch (err) {
        console.error(`[DB DELETE] Error deleting from DB (update_id: ${updateId}): ${err.message}`);
        throw err;
    }
}

function getMessageByUpdateId(updateId) {
    const selectStmt = db.prepare(`SELECT * FROM telegram_channel_posts WHERE update_id = ?`);
    try {
        return selectStmt.get(updateId); // Returns row object or undefined
    } catch (err) {
        console.error(`[DB GET] Error retrieving from DB (update_id: ${updateId}): ${err.message}`);
        throw err;
    }
}

// --- Webhook Endpoint ---
app.post(ENDPOINT, (req, res) => { // Now sync handler, but async logic is possible inside
    const update = req.body;
    if (update && update.update_id) {
        console.log(`[BOT1] Received channel post. Update ID: ${update.update_id}`);
        try {
            saveMessageToDb(update); // Call the synchronous save function
        } catch (e) {
            console.error(`[BOT1] Error processing webhook and saving message: ${e.message}`);
            // Depending on the error, you might log it more severely or trigger alerts
        }
    } else {
        console.log("[BOT1] Received invalid update.");
    }

    res.sendStatus(200); // Always send a 200 OK response to Telegram
});

// --- Health Check Endpoint ---
app.get('/health', (req, res) => {
    res.status(200).send('Bot webhook server is running');
});

async function setTelegramWebhook() {
    try {
        const response = await axios.post(`${TELEGRAM_API_BASE_URL}/setWebhook`, {
            url: WEBHOOK_URL,
            allowed_updates: ["channel_post"]
        });
        if (response.data.ok) {
            console.log(`Telegram webhook successfully set to: ${WEBHOOK_URL}`);
        } else {
            console.error("Failed to set Telegram webhook:", response.data);
        }
    } catch (e) {
        console.error("Error setting webhook:", e.message);
        if (e.response && e.response.data && e.response.data.description) {
            console.error("Telegram API response error:", e.response.data.description);
            if (e.response.data.description.includes('wrong url host') || e.response.data.description.includes('SSL error')) {
                console.error("Please double-check your WEBHOOK_BASE, ENDPOINT, and Nginx SSL configuration.");
            }
        }
    }
}

module.exports = {
    app,
    appInit,
    setTelegramWebhook,
    closeDb,
    // for tests:
    deleteMessageFromDb,
    getMessageByUpdateId,
    saveMessageToDb,
    ENDPOINT
};
