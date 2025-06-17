const { app, initializeDb, setTelegramWebhook, closeDb, getDb, DB_PATH } = require('./app');
const fs = require('fs'); // For file system operations (like deleting test DB)

async function startApplication() {
    // Clean up potential old test DB if it exists from previous runs
    // In a real app, you might not do this on every startup
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log(`Deleted existing database file: ${DB_PATH}`);
    }

    await initializeDb();
    const server = app.listen(process.env.PORT || 3000, async () => {
        console.log(`Express server listening on internal port ${process.env.PORT || 3000}`);
        console.log(`Publicly exposed Webhook URL: https://${process.env.WEBHOOK_DOMAIN}${process.env.WEBHOOK_PATH}`);

        // Set the webhook with Telegram. This only needs to be successful once.
        await setTelegramWebhook();
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('SIGINT signal received: closing HTTP server');
        server.close(async () => {
            console.log('HTTP server closed.');
            await closeDb();
            process.exit(0);
        });
    });

    process.on('SIGTERM', async () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(async () => {
            console.log('HTTP server closed.');
            await closeDb();
            process.exit(0);
        });
    });
}

startApplication();
