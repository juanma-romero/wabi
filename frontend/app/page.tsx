'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Message {
  // Define a more specific type based on your actual message structure
  // For example, if your message object has a 'text' and 'sender' field:
  // text: string;
  // sender: string;
  // For now, we'll use a generic object type
  [key: string]: any;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = 'http://localhost:3000'; // Your API server

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log(`Fetching messages from ${apiBaseUrl}/get-messages`);
    try {
      const response = await fetch(`${apiBaseUrl}/get-messages`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Message[] = await response.json();
      console.log('Fetched data:', data);
      setMessages(data);
    } catch (e: any) {
      console.error('Failed to fetch messages:', e);
      setError(e.message || 'An unknown error occurred');
      setMessages([]); // Clear messages on error
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]); // Removed fetchMessages from dependencies as it causes re-renders

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]); // fetchMessages is stable due to useCallback

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-gray-900 text-white font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-3xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-green-400">WhatsApp Messages</h1>
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

        {messages.length === 0 && !isLoading && !error && (
          <div className="p-6 bg-gray-800 rounded-lg shadow-lg text-center">
            <p className="text-xl text-gray-400">No messages yet. Send a message to your WhatsApp number!</p>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-6">
            {messages.slice().reverse().map((msg, index) => ( // Display newest first
              <div key={index} className="p-6 bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200">
                <pre className="whitespace-pre-wrap text-sm text-gray-300">
                  {JSON.stringify(msg, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
