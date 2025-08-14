import { kv } from '@vercel/kv';

// This endpoint handles partial updates to a session, like adding tags or notes.
export default async function handler(request, response) {
  if (request.method !== 'PATCH') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = request.query;
  const sessionKey = `session:${id}`;

  try {
    const currentSession = await kv.get(sessionKey);
    if (!currentSession) {
      return response.status(404).json({ error: 'Session not found.' });
    }

    const { tags, notes } = request.body;
    const updateData = {};
    if (tags) updateData.tags = tags;
    if (notes) updateData.notes = notes;

    await kv.hset(sessionKey, updateData);

    return response.status(200).json({ success: true });
  } catch (error) {
    console.error(`Error updating session ${id}:`, error);
    return response.status(500).json({ error: 'Failed to update session.' });
  }
}
