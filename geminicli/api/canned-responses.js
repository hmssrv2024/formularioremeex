import { kv } from '@vercel/kv';

// GET /api/canned-responses -> returns all responses
// POST /api/canned-responses -> creates a new response
// DELETE /api/canned-responses -> deletes a response

export default async function handler(request, response) {
  if (request.method === 'GET') {
    try {
      const responses = await kv.hgetall('canned-responses');
      return response.status(200).json(responses || {});
    } catch (error) {
      return response.status(500).json({ error: 'Failed to retrieve canned responses.' });
    }
  }

  if (request.method === 'POST') {
    try {
      const { id, title, text } = request.body;
      await kv.hset('canned-responses', { [id]: { title, text } });
      return response.status(201).json({ success: true });
    } catch (error) {
      return response.status(500).json({ error: 'Failed to create canned response.' });
    }
  }

  if (request.method === 'DELETE') {
    try {
      const { id } = request.query;
      await kv.hdel('canned-responses', id);
      return response.status(200).json({ success: true });
    } catch (error) {
      return response.status(500).json({ error: 'Failed to delete canned response.' });
    }
  }

  return response.status(405).json({ error: 'Method Not Allowed' });
}
