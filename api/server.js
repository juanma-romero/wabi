import express from 'express';

import dotenv from 'dotenv'

import pkg from 'body-parser';
const { urlencoded, json } = pkg;

var app = express();

app.use(urlencoded({extended: false}));
app.use(json())

dotenv.config()
const TOKEN = process.env.WEBHOOK_VERIFY_TOKEN

app.get("/", function (request, response) {
  response.send('Simple WhatsApp Webhook tester</br>There is no front-end, see server.js for implementation!')
})

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
  console.log(request.body);
  console.log('Incoming webhook: ' + JSON.stringify(request.body));
  response.sendStatus(200);
})

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
})

