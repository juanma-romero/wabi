'use client';

import { useState, useEffect, useCallback } from 'react';

// --- Nuevas interfaces para el análisis de mensajes ---
interface WhatsAppMessageContent {
  body: string;
}

interface WhatsAppMessage {
  from: string; // Número de teléfono del remitente
  id: string; // ID del mensaje
  timestamp: string; // Marca de tiempo Unix como cadena
  text?: WhatsAppMessageContent; // Opcional, ya que el tipo de mensaje podría no ser de texto
  type: string; // Por ejemplo, "text", "image", etc.
  // Agrega otros campos de mensaje (imagen, video, etc.) aquí si es necesario
}

interface WebhookEntryChangeValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string; // Este es el ID del número de teléfono del bot
  };
  contacts: Array<{
    profile: { name: string };
    wa_id: string; // ID de WhatsApp del usuario
  }>;
  messages?: WhatsAppMessage[]; // Opcional, ya que el webhook podría ser para actualizaciones de estado, etc.
}

interface WebhookEntryChange {
  value: WebhookEntryChangeValue;
  field: string;
}

interface WebhookEntry {
  id: string;
  changes: WebhookEntryChange[];
}

interface WebhookBody {
  object: string;
  entry: WebhookEntry[];
}

// Estructura de mensaje simplificada para mostrar en el frontend
interface DisplayMessage {
  id: string;
  sender: 'user' | 'bot'; // 'user' para entrante, 'bot' para saliente
  fromNumber: string; // El número de teléfono real del remitente
  text: string;
  timestamp: number; // Convertido a número para ordenar
  originalData: any; // Mantener los datos originales del webhook para depuración
} 

export default function Home() {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = 'http://localhost:3000'; // Your API server

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log(`Fetching messages from ${apiBaseUrl}/get-messages`);
    try {
      const response = await fetch(`${apiBaseUrl}/get-messages`); // Esto devuelve los webhooks brutos
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const rawWebhooks: WebhookBody[] = await response.json();
      console.log('Fetched raw webhooks:', rawWebhooks);

      const processedMessages: DisplayMessage[] = [];

      rawWebhooks.forEach(webhook => {
        // Validación básica para asegurar que es un webhook de mensaje
        if (webhook.object === 'whatsapp_business_account' && webhook.entry && webhook.entry.length > 0) {
          webhook.entry.forEach(entry => {
            if (entry.changes && entry.changes.length > 0) {
              entry.changes.forEach(change => {
                if (change.field === 'messages' && change.value.messages && change.value.messages.length > 0) {
                  const whatsappMessage = change.value.messages[0];
                  const botPhoneNumberId = change.value.metadata.phone_number_id; // Obtener el número del bot de los metadatos del webhook

                  // Mensaje entrante del usuario
                  if (whatsappMessage.type === 'text') {
                    const userMessage: DisplayMessage = {
                      id: whatsappMessage.id,
                      sender: 'user',
                      fromNumber: whatsappMessage.from,
                      text: whatsappMessage.text?.body || '',
                      timestamp: parseInt(whatsappMessage.timestamp) * 1000, // Convertir a milisegundos
                      originalData: webhook,
                    };
                    processedMessages.push(userMessage);

                    // Simular la respuesta del bot (basado en la lógica de server.js)
                    // Esta es una simulación solo en el frontend, ya que el backend no almacena las respuestas en este array
                    const botReplyText = `Hola! Recibí tu mensaje: "${whatsappMessage.text?.body}"`;
                    const botReplyMessage: DisplayMessage = {
                      id: `${whatsappMessage.id}-reply`, // ID único para la respuesta
                      sender: 'bot',
                      fromNumber: botPhoneNumberId, // Número del bot
                      text: botReplyText,
                      timestamp: (parseInt(whatsappMessage.timestamp) + 1) * 1000, // +1 segundo para la respuesta
                      originalData: { simulated: true, originalMessageId: whatsappMessage.id },
                    };
                    processedMessages.push(botReplyMessage);
                  }
                  // Agrega más tipos de mensajes (imagen, video, etc.) aquí si es necesario
                }
              });
            }
          });
        }
      });

      // Ordenar los mensajes por marca de tiempo
      processedMessages.sort((a, b) => a.timestamp - b.timestamp);

      setDisplayMessages(processedMessages);
    } catch (e: any) {
      console.error('Failed to fetch messages:', e);
      setError(e.message || 'An unknown error occurred');
      setDisplayMessages([]); // Borrar mensajes en caso de error
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]); // Removed fetchMessages from dependencies as it causes re-renders

  useEffect(() => {
    fetchMessages(); // fetchMessages es estable debido a useCallback
  }, [fetchMessages]); // fetchMessages is stable due to useCallback

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-gray-900 text-white font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-3xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-green-400">Conversación de WhatsApp</h1>
          <button
            onClick={fetchMessages}
            disabled={isLoading}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Messages'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-700 border border-red-900 rounded-lg text-center">
            <p className="font-semibold">Error loading messages:</p>
            <p>{error}</p>
            <p className="mt-2 text-sm">Ensure your API server at {apiBaseUrl} is running and accessible.</p>
          </div>
        )}

        {displayMessages.length === 0 && !isLoading && !error && (
          <div className="p-6 bg-gray-800 rounded-lg shadow-lg text-center">
            <p className="text-xl text-gray-400">No messages yet. Send a message to your WhatsApp number!</p>
          </div>
        )}

        {displayMessages.length > 0 && (
          <div className="space-y-4">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-gray-700 text-gray-100 rounded-bl-none'
                      : 'bg-green-600 text-white rounded-br-none'
                  }`}
                >
                  <div className="font-bold text-xs mb-1">
                    {msg.sender === 'user' ? `De: ${msg.fromNumber}` : 'Tú (Bot)'}
                  </div>
                  <p className="text-sm">{msg.text}</p>
                  <div className="text-right text-xs text-gray-400 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
