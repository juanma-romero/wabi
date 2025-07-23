import express from 'express'
import cors from 'cors'
import axios from 'axios'
import dotenv from 'dotenv'

var app = express()
app.use(express.json()) // Use express.json() instead of body-parser

app.use(cors())

dotenv.config();
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID
const BACKEND_URL = 'http://34.44.100.213:3000' // URL of backend VM

app.get("/", function (request, response) {
  response.send('Simple WhatsApp Webhook tester</br>There is no front-end, see server.js for implementation!');
});

app.get('/webhook', function (req, res) {
  if (
    req.query['hub.mode'] == 'subscribe' &&
    req.query['hub.verify_token'] == VERIFY_TOKEN
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
})

app.post("/webhook", async (request, response) => {
  console.log('Incoming webhook body:', JSON.stringify(request.body, null, 2));

  // --- Lógica para filtrar y guardar mensajes ---
  const change = request.body?.entry?.[0]?.changes?.[0];

  // Verifica que sea una notificación de mensaje de WhatsApp y no un estado
  if (change?.value?.messages && change?.value?.contacts) {
    const contact = change.value.contacts[0];
    const message = change.value.messages[0];

    // Lista de remitentes permitidos por su wa_id
    const allowedSenders = ["595985214420", "595983422117"]; // 'Voraz' y 'zuld.'

    if (allowedSenders.includes(contact.wa_id) && message.type === "text") {
      // Forward the message to the backend
      try {
        const backendResponse = await axios.post(`${BACKEND_URL}/whatsapp-inbound`, {
          contact: contact,
          message: message
        });

        // If the backend provides a response, forward it to WhatsApp
        if (backendResponse.data.reply) {
          await sendWhatsAppMessage(message.from, backendResponse.data.reply);
        }
      } catch (error) {
        console.error('Error forwarding message to backend:', error.response ? error.response.data : error.message);
        // Optionally, send an error message back to the user
        await sendWhatsAppMessage(message.from, "Error processing your request.");
      }
    } else {
      console.log(`Message from an unauthorized sender or not a text message: ${contact?.wa_id}`);
    }
  } else if (change?.value?.statuses) {
    console.log('Status update received:', JSON.stringify(change.value.statuses, null, 2));
  } else {
    console.log('Unknown webhook format:', JSON.stringify(request.body, null, 2));
  }

  response.sendStatus(200);
});

// Helper function to send a WhatsApp message
async function sendWhatsAppMessage(to, body) {
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
        to: to,
        text: { body: body }
      }
    });
    console.log(`Sent message to ${to}: ${body}`);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
  }
}

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
})
