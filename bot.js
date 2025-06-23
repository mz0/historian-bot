const { app, appInit, closeDb } = require('./app');

async function startApplication() {
    await appInit();
    const server = app.listen(process.env.PORT || 3000, async () => {
        console.log(`Express server listening on internal port ${process.env.PORT || 3000}`);
        console.log(`Publicly exposed Webhook URL: https://${process.env.WEBHOOK_BASE}${process.env.ENDPOINT}`);
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
