import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import pkg from 'body-parser'
const { urlencoded, json } = pkg
import { MongoClient } from 'mongodb'

var app = express()

app.use(cors())
app.use(urlencoded({ extended: false }));
app.use(json())

dotenv.config();
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID
const MONGODB_URI = process.env.MONGODB_URI

const client = new MongoClient(MONGODB_URI);

async function connectToMongo() {
  try {
    await client.connect();
    console.log("Conectado a MongoDB");
  } catch (err) {
    console.error("Error al conectar a MongoDB", err);
    process.exit(1);
  }
}

connectToMongo();

// --- Nueva función para manejar el comando '/listado' ---
function handleListadoRequest(from) {
  console.log('listado pedido');
  // Aquí se podría agregar lógica para enviar una respuesta específica si se quisiera.
}

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

app.post("/webhook", async function (request, response) {
  console.log('Incoming webhook body:', JSON.stringify(request.body, null, 2));

  // --- Lógica para filtrar y guardar mensajes ---
  const change = request.body?.entry?.[0]?.changes?.[0];

  // Verifica que sea una notificación de mensaje de WhatsApp y no un estado
  if (change?.value?.messages && change?.value?.contacts) {
    const contact = change.value.contacts[0];
    const message = change.value.messages[0];

    // Lista de remitentes permitidos por su wa_id
    const allowedSenders = ["595985214420", "595983422117"]; // 'Voraz' y 'zuld.'

    if (allowedSenders.includes(contact.wa_id)) {
      // Es un mensaje de un remitente permitido, lo guardamos
      const db = client.db("wabi");
      const messagesCollection = db.collection("mensajes");
      try {
        await messagesCollection.insertOne(request.body);
        console.log(`Mensaje de ${contact.profile.name} (${contact.wa_id}) guardado en MongoDB`);
      } catch (err) {
        console.error("Error al guardar el mensaje en MongoDB", err);
      }

      // --- Lógica para procesar y responder mensajes ---
      // Verifica si es un mensaje de texto para enviar una respuesta
      if (message.type === "text") {
        const from = message.from; // Número de teléfono del remitente.
        const msg_body = message.text.body.trim(); // El texto del mensaje.

        // --- Lógica de comandos ---
        if (msg_body === '/listado') {
          handleListadoRequest(from);
        } else {
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
    } else {
      console.log(`Mensaje de un remitente no permitido (${contact.wa_id}), no se guarda en DB.`);
    }
  } else if (change?.value?.statuses) {
    console.log('Webhook de estado recibido, no se guarda en DB.');
  } else {
    console.log('Webhook no es un mensaje o no tiene la estrutura esperada, no se guarda en DB.');
  }

  response.sendStatus(200);
});

// New endpoint to get stored messages
app.get('/get-messages', async (req, res) => {
  const db = client.db("wabi");
  const messagesCollection = db.collection("mensajes");
  const messages = await messagesCollection.find({}).toArray();
  res.json(messages);
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
})
