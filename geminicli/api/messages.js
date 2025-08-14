import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  const { sessionId, since } = request.query;

  if (!sessionId) {
    return response.status(400).json({ error: 'Session ID is required.' });
  }

  // POST /api/messages -> creates a new message
  if (request.method === 'POST') {
    try {
      const { from, type, text, fileUrl, fileName } = request.body;
      const message = {
        from,
        type,
        text,
        fileUrl,
        fileName,
        timestamp: Date.now(),
      };

      const sessionKey = `session:${sessionId}`;
      const messageListKey = `messages:${sessionId}`;

      // Add message to the session's sorted list
      await kv.zadd(messageListKey, { score: message.timestamp, member: JSON.stringify(message) });
      
      // Update session's last update time and mark as unread for admin
      const updateData = {
        lastUpdate: message.timestamp,
        lastMessage: type === 'text' ? text : `[${type}]`
      };
      if (from === 'user') {
        updateData.unreadAdmin = true;
      }

      await kv.hset(sessionKey, updateData);
      await kv.zadd('sessions_by_update', { score: message.timestamp, member: sessionKey });

      return response.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: 'Failed to send message.' });
    }
  }

  // GET /api/messages -> gets messages for a session
  if (request.method === 'GET') {
    try {
      const minTimestamp = since || 0;
      const messages = await kv.zrange(`messages:${sessionId}`, minTimestamp, -1, { byScore: true });
      const parsedMessages = messages.map(m => JSON.parse(m));
      return response.status(200).json(parsedMessages);
    } catch (error) {
      return response.status(500).json({ error: 'Failed to retrieve messages.' });
    }
  }

  return response.status(405).json({ error: 'Method Not Allowed' });
}
