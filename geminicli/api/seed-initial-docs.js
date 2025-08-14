import { kv } from '@vercel/kv';

// IMPORTANT: This is a one-time seeding script.
// You can run this by visiting /api/seed-initial-docs in your browser or via curl.
// In a real-world scenario, you might build a small admin interface to manage this.

const DOCUMENTS_TO_SEED = [
    {
        id: 'doc:gemini',
        title: 'gemini.txt',
        // PASTE YOUR TEXT CONTENT HERE
        content: `Este es el contenido de gemini.txt. Gemini es un modelo de lenguaje grande, entrenado por Google.`
    },
    {
        id: 'doc:primera',
        title: 'primera.txt',
        // PASTE YOUR TEXT CONTENT HERE
        content: `Este es el contenido de primera.txt. La primera regla del club de la pelea es no hablar del club de la pelea.`
    },
    {
        id: 'doc:segunda',
        title: 'segunda.txt',
        // PASTE YOUR TEXT CONTENT HERE
        content: `Este es el contenido de segunda.txt. La segunda regla es que solo dos personas pelean a la vez.`
    }
];

// Helper function to call our own AI API for embeddings
async function getEmbeddings(texts, fetch) {
    // Construct the full URL for the API endpoint
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const apiUrl = new URL('/api/ai', baseUrl);

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'embedTexts', texts })
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to get embeddings from AI API: ${errorBody}`);
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
    try {
        console.log("Starting to seed documents...");
        const pipeline = kv.pipeline();
        let totalChunks = 0;

        for (const doc of DOCUMENTS_TO_SEED) {
            console.log(`Processing ${doc.title}...`);
            const chunks = chunkText(doc.content);
            const embeddings = await getEmbeddings(chunks, fetch);
            
            console.log(`Got ${embeddings.length} embeddings for ${doc.title}.`);

            pipeline.hset(doc.id, {
                id: doc.id,
                title: doc.title,
                createdAt: Date.now(),
                chunkCount: chunks.length,
            });

            for (let i = 0; i < chunks.length; i++) {
                const chunkId = `${doc.id}:chunk:${i}`;
                pipeline.hset(chunkId, {
                    docId: doc.id,
                    chunkIndex: i,
                    text: chunks[i],
                    embedding: JSON.stringify(embeddings[i]),
                });
            }
            totalChunks += chunks.length;
        }

        await pipeline.exec();
        console.log("Seeding complete!");
        return response.status(200).json({ success: true, message: `Successfully seeded ${DOCUMENTS_TO_SEED.length} documents with a total of ${totalChunks} chunks.` });
    } catch (error) {
        console.error("Seeding error:", error);
        return response.status(500).json({ error: 'Failed to seed initial documents.', details: error.message });
    }
}
