import express from 'express';
import cors from 'cors'; // Import cors
import dotenv from 'dotenv';
import pkg from 'body-parser';
const { urlencoded, json } = pkg;

var app = express();

app.use(cors()); // Enable CORS for all routes
app.use(urlencoded({extended: false}));
app.use(json());

dotenv.config();
const TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

let messages = []; // In-memory store for messages

app.get("/", function (request, response) {
  response.send('Simple WhatsApp Webhook tester</br>There is no front-end, see server.js for implementation!');
});

app.get('/webhook', function(req, res) {
  if (
    req.query['hub.mode'] == 'subscribe' &&
    req.query['hub.verify_token'] == TOKEN
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
})

app.post("/webhook", function (request, response) {
  console.log('Incoming webhook body:', request.body);
  messages.push(request.body); // Store the incoming message
  // For now, let's keep a maximum of 100 messages to avoid memory issues
  if (messages.length > 100) {
    messages.shift(); // Remove the oldest message
  }
  console.log('Stored messages:', messages);
  response.sendStatus(200);
});

// New endpoint to get stored messages
app.get('/get-messages', function(req, res) {
  res.json(messages);
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
