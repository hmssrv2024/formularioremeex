import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';
import pdf from 'pdf-parse/lib/pdf-parse.js';

// Helper function to call our own AI API for embeddings
async function getEmbeddings(texts, fetch) {
    const response = await fetch(new URL('/api/ai', process.env.VERCEL_URL || 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'embedTexts', texts })
    });
    if (!response.ok) {
        throw new Error('Failed to get embeddings from AI API');
    }
    const { embeddings } = await response.json();
    return embeddings;
}

// Helper function to chunk text
function chunkText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        const end = i + chunkSize;
        chunks.push(text.substring(i, end));
        i += chunkSize - overlap;
    }
    return chunks;
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return response.status(400).json({ error: 'No file provided.' });
        }

        // 1. Upload the original PDF to Vercel Blob
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const { url: fileUrl } = await put(`docs/${file.name}`, fileBuffer, {
            access: 'public',
            contentType: 'application/pdf',
        });

        // 2. Parse PDF text
        const data = await pdf(fileBuffer);
        const text = data.text;

        // 3. Chunk the text
        const chunks = chunkText(text);

        // 4. Get embeddings for each chunk
        const embeddings = await getEmbeddings(chunks, fetch);

        // 5. Save doc metadata and chunks with embeddings to KV
        const docId = `doc:${Date.now()}`;
        const pipeline = kv.pipeline();

        pipeline.hset(docId, {
            id: docId,
            title: file.name,
            url: fileUrl,
            createdAt: Date.now(),
            chunkCount: chunks.length,
        });

        for (let i = 0; i < chunks.length; i++) {
            const chunkId = `${docId}:chunk:${i}`;
            pipeline.hset(chunkId, {
                docId,
                chunkIndex: i,
                text: chunks[i],
                embedding: JSON.stringify(embeddings[i]), // Store embedding as a string
            });
        }

        await pipeline.exec();

        return response.status(200).json({ success: true, docId, chunks: chunks.length });

    } catch (error) {
        console.error('RAG Doc processing error:', error);
        return response.status(500).json({ error: 'Failed to process and index document.' });
    }
}

export const config = {
    api: {
        bodyParser: false, // Let Next.js not parse the body, we use formData
    },
};
