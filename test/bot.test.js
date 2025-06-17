const request = require('supertest'); // Used to make HTTP requests to your Express app
const fs = require('fs'); // For file system operations
const { app, initializeDb, closeDb, getMessageByUpdateId, DB_PATH, WEBHOOK_PATH } = require('../app'); // Import components from app.js

describe('Telegram Webhook Bot DB Integration Test', () => {
    let server; // To hold the Express server instance
    const TEST_DB_PATH = path.resolve(__dirname, 'test_messages.db'); // Use a separate DB for tests

    // Before all tests, initialize a dedicated test database
    beforeAll(async () => {
        // Ensure app.js uses the test DB path for this context
        // This requires a minor modification to app.js's DB_PATH setup
        // For simplicity here, we'll recreate the DB and ensure it's clean.
        // A more robust solution might pass DB_PATH as a parameter to initializeDb.

        // Temporarily adjust DB_PATH in app.js for tests, or ensure initializeDb takes a path.
        // For this example, let's just make sure we wipe the main DB file if it exists
        // before running tests, and then recreate it. Or better, just recreate the DB.
        
        // Ensure the database file for the test is clean
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
        // Initialize the DB (this will create it at DB_PATH if it doesn't exist)
        await initializeDb(); // Initialize the main DB for the app context

        server = app.listen(0); // Start the Express app on an ephemeral port
        console.log(`Test server started on port: ${server.address().port}`);
    }, 10000); // Increased timeout for DB initialization and server start

    // After all tests, close the database and server
    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
            console.log('Test server closed.');
        }
        await closeDb(); // Close the database connection
        // Clean up the test database file
        if (fs.existsSync(DB_PATH)) { // Using the main DB_PATH
            fs.unlinkSync(DB_PATH);
            console.log(`Deleted test database file: ${DB_PATH}`);
        }
    });

    it('should receive a mock Telegram channel_post, save it, and then delete it', async () => {
        const testUpdateId = Date.now(); // Unique ID for this test run
        const testMessageId = Math.floor(Math.random() * 1000000) + 1;
        const testChatId = -100123456789; // Example channel ID

        const testMessageText = `TEST_MESSAGE - Jest Test - ${new Date().toISOString()}`;
        const mockUpdate = {
            update_id: testUpdateId,
            channel_post: {
                message_id: testMessageId,
                chat: {
                    id: testChatId,
                    title: "Jest Test Channel",
                    type: "channel"
                },
                date: Math.floor(Date.now() / 1000),
                text: testMessageText
            }
        };

        // 1. Simulate Telegram sending a webhook POST request
        console.log(`[TEST STEP 1] Sending mock webhook to ${WEBHOOK_PATH} for update_id: ${testUpdateId}`);
        const webhookResponse = await request(app)
            .post(WEBHOOK_PATH) // Use the actual webhook path
            .send(mockUpdate)
            .expect(200); // Telegram expects a 200 OK response

        // Wait a small moment for async DB operations to settle
        await new Promise(resolve => setTimeout(resolve, 50));

        // 2. Verify it's saved in the DB
        console.log(`[TEST STEP 2] Verifying message with update_id: ${testUpdateId} in DB...`);
        let savedMessage = await getMessageByUpdateId(testUpdateId);
        expect(savedMessage).toBeDefined();
        expect(savedMessage.update_id).toBe(testUpdateId);
        expect(savedMessage.text).toBe(testMessageText);
        console.log(`[TEST STEP 2] Message verified in DB: ${savedMessage.text}`);

        // 3. Delete it from DB
        console.log(`[TEST STEP 3] Deleting message with update_id: ${testUpdateId} from DB...`);
        const deleteSuccess = await deleteMessageFromDb(testUpdateId);
        expect(deleteSuccess).toBe(true);
        console.log(`[TEST STEP 3] Message successfully deleted.`);

        // 4. Verify it's gone from the DB
        console.log(`[TEST STEP 4] Verifying message with update_id: ${testUpdateId} is gone from DB...`);
        savedMessage = await getMessageByUpdateId(testUpdateId);
        expect(savedMessage).toBeUndefined(); // Should no longer be found
        console.log(`[TEST STEP 4] Message confirmed deleted from DB.`);
    }, 20000); // Increased timeout for the test case itself
});
