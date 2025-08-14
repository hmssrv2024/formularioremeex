import { put } from '@vercel/blob';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { sessionId, filename } = request.query;
  if (!sessionId || !filename) {
    return response.status(400).json({ error: 'Session ID and filename are required.' });
  }

  try {
    const blob = await put(`uploads/${sessionId}/${filename}`, request.body, {
      access: 'public',
    });
    return response.status(200).json(blob);
  } catch (error) {
    console.error('Upload error:', error);
    return response.status(500).json({ error: 'Failed to upload file.' });
  }
}
