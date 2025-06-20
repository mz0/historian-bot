const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies for POST requests
app.use(express.json());

// GET endpoint for '/'
app.get('/', (req, res) => {
  res.send('Hi');
});

// POST endpoint for '/'
app.post('/', (req, res) => {
  console.log('Received POST parameters:', req.body);
  res.send('Parameters received!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

/* Check proxied endpoint (add -k if no full-chain certificate received):
 curl -X POST \
   -H "Content-Type: application/json" \
   -d '{"name": "Alice", "status": "active", "id": 123}'  \
   https://wdr.x320.net/historian/
*/
