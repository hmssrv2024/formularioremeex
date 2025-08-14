/**
 * AI API Endpoint
 * This serverless function acts as a secure proxy to the actual AI provider (e.g., Gemini).
 * It reads the API key from server-side environment variables, preventing exposure to the client.
 */

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

async function handleImproveWriting(body) {
    const { draft, tone } = body;
    const prompt = `Reformula el siguiente borrador para que suene más ${tone}. Mantén el significado original pero ajusta el estilo.\n\nBorrador: \"${draft}\"\n\nVersión Mejorada:`;
    const result = await generateText(prompt);
    return { improvedText: result };
}

async function handleRagAnswer(body) {
    const { question, contextChunks } = body;
    const context = contextChunks.map(c => c.text).join('\n\n---\n\n');
    const prompt = `Eres un asistente de soporte amable y profesional. Usando el siguiente contexto, responde la pregunta del usuario. Si la respuesta no está en el contexto, indica que no tienes la información.\n\nContexto:\n${context}\n\nPregunta: ${question}\n\nRespuesta:`;
    const result = await generateText(prompt);
    return { answer: result };
}

// Add other handlers for embedTexts, analyzeImage, transcribeAudio following the same pattern

async function generateText(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-1.5-flash'; // Or read from env vars
    const url = `${GEMINI_API_BASE_URL}${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('Gemini API Error:', error);
        throw new Error('Failed to generate text from Gemini API.');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { action, ...body } = request.body;
        let result;

        switch (action) {
            case 'improveWriting':
                result = await handleImproveWriting(body);
                break;
            case 'ragAnswer':
                result = await handleRagAnswer(body);
                break;
                        case 'embedTexts':
                result = await handleEmbedTexts(body);
                break;
            case 'analyzeImage':
                result = await handleAnalyzeImage(body);
                break;
            case 'transcribeAudio':
                result = await handleTranscribeAudio(body);
                break;
            default:
                return response.status(400).json({ error: 'Invalid AI action.' });
        }

        return response.status(200).json(result);
    } catch (error) {
        console.error('Error in AI handler:', error);
        return response.status(500).json({ error: error.message });
    }
}