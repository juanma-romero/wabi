import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import pkg from 'body-parser'
const { urlencoded, json } = pkg

var app = express() 

app.use(cors())
app.use(urlencoded({extended: false}));
app.use(json())

dotenv.config();
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

let messages = [] // In-memory store for messages

app.get("/", function (request, response) {
  response.send('Simple WhatsApp Webhook tester</br>There is no front-end, see server.js for implementation!');
});

app.get('/webhook', function(req, res) {
  if (
    req.query['hub.mode'] == 'subscribe' &&
    req.query['hub.verify_token'] == VERIFY_TOKEN
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
})

app.post("/webhook", async function (request, response) {
  console.log('Incoming webhook body:', JSON.stringify(request.body, null, 2));

  // Store the raw message for debugging
  messages.push(request.body);
  if (messages.length > 100) {
    messages.shift();
  }

  // --- Lógica para procesar y responder mensajes ---

  // Verifica que sea una notificación de mensaje de WhatsApp
  if (
    request.body.object &&
    request.body.entry &&
    request.body.entry[0].changes &&
    request.body.entry[0].changes[0] &&
    request.body.entry[0].changes[0].value.messages &&
    request.body.entry[0].changes[0].value.messages[0]
  ) {
    const message = request.body.entry[0].changes[0].value.messages[0];

    // Verifica si es un mensaje de texto
    if (message.type === "text") {
      const from = message.from; // Número de teléfono del remitente
      const msg_body = message.text.body; // El texto del mensaje

      // Lógica simple de respuesta automática
      try {
        await axios({
          method: 'POST',
          url: `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          data: {
            messaging_product: 'whatsapp',
            to: from,
            text: { body: 'Hola! Recibí tu mensaje: "' + msg_body + '"' }
          }
        });
        console.log('¡Respuesta enviada exitosamente!');
      } catch (error) {
        console.error('Error al enviar el mensaje:', error.response ? error.response.data : error.message);
      }
    }
  }

  response.sendStatus(200);
});

// New endpoint to get stored messages
app.get('/get-messages', function(req, res) {
  res.json(messages);
})

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
})
