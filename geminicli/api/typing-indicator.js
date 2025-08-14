import { kv } from '@vercel/kv';

// Sets a temporary key to indicate a user is typing.
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { sessionId, isTyping } = request.body;
  const typingKey = `typing:${sessionId}`;

  try {
    if (isTyping) {
      // Set the key with a 5-second expiration
      await kv.set(typingKey, 'true', { ex: 5 });
    } else {
      // Or remove it immediately
      await kv.del(typingKey);
    }
    return response.status(200).json({ success: true });
  } catch (error) {
    return response.status(500).json({ error: 'Failed to set typing indicator.' });
  }
}
