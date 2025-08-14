import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';

export default async function handler(request, response) {
  // GET /api/sessions -> returns all sessions
  if (request.method === 'GET') {
    try {
      const sessionIds = await kv.zrange('sessions_by_update', 0, -1, { rev: true });
      if (!sessionIds.length) {
        return response.status(200).json([]);
      }
      const sessions = await kv.mget(...sessionIds);
      return response.status(200).json(sessions);
    } catch (error) {
      return response.status(500).json({ error: 'Failed to retrieve sessions.' });
    }
  }

  // POST /api/sessions -> creates a new session
  if (request.method === 'POST') {
    try {
      const sessionId = nanoid(10);
      const { ip, geo, headers } = request;
      const userAgent = headers.get('user-agent');

            const session = {
        sessionId,
        createdAt: Date.now(),
        lastUpdate: Date.now(),
        lastMessage: 'Sesión iniciada.',
        unreadAdmin: true, // Mark as unread for admin by default
        tags: [],
        notes: '',
        analytics: {
            ip,
            country: geo?.country,
            city: geo?.city,
            region: geo?.region,
            userAgent
        }
      };
      await kv.set(`session:${sessionId}`, session);
      await kv.zadd('sessions_by_update', { score: Date.now(), member: `session:${sessionId}` });
      return response.status(201).json({ sessionId });
    } catch (error) {
      return response.status(500).json({ error: 'Failed to create session.' });
    }
  }

  return response.status(405).json({ error: 'Method Not Allowed' });
}
