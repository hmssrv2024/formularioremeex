/**
 * AI Adapter Module (Vercel Architecture)
 * This module acts as a simple bridge between the client-side code and our own backend API.
 * It makes fetch requests to our serverless functions, which then securely call the AI provider.
 * The API key is never exposed to the client.
 */
const aiAdapter = (() => {

    /**
     * A generic helper to call our backend AI endpoint.
     * @param {object} body - The request body, must include an 'action' property.
     * @returns {Promise<any>} - The JSON response from the serverless function.
     */
    async function _callApi(body) {
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'API call failed');
            }

            return await response.json();
        } catch (error) {
            console.error(`Error calling AI API for action ${body.action}:`, error);
            throw error;
        }
    }

    /**
     * Generates text embeddings for an array of strings via our backend.
     * @param {string[]} texts - An array of texts to embed.
     * @returns {Promise<number[][]>} - A promise that resolves to an array of embedding vectors.
     */
    async function embedTexts(texts) {
        const { embeddings } = await _callApi({ action: 'embedTexts', texts });
        return embeddings;
    }

    /**
     * Generates a response based on a question and context using RAG.
     * @param {object} params - The RAG parameters.
     * @param {string} params.question - The user's question.
     * @param {object[]} params.contextChunks - Array of context chunk objects.
     * @returns {Promise<string>} - A promise that resolves to the generated answer.
     */
    async function ragAnswer({ question, contextChunks }) {
        const { answer } = await _callApi({ action: 'ragAnswer', question, contextChunks });
        return answer;
    }

    /**
     * Improves a draft message based on a specified tone.
     * @param {object} params - The improvement parameters.
     * @param {string} params.draft - The text to improve.
     * @param {string} params.tone - The desired tone ('claro', 'amable', 'profesional').
     * @returns {Promise<string>} - A promise that resolves to the improved text.
     */
    async function improveWriting({ draft, tone }) {
        const { improvedText } = await _callApi({ action: 'improveWriting', draft, tone });
        return improvedText;
    }

    /**
     * Analyzes an image and answers a question about it.
     * @param {object} params - The analysis parameters.
     * @param {string} params.base64Image - The base64-encoded image data.
     * @param {string} params.mimeType - The MIME type of the image.
     * @param {string} params.question - The question about the image.
     * @returns {Promise<string>} - A promise that resolves to the text analysis.
     */
    async function analyzeImage({ base64Image, mimeType, question }) {
        const { analysis } = await _callApi({ action: 'analyzeImage', base64Image, mimeType, question });
        return analysis;
    }

    /**
     * Transcribes an audio blob via our backend.
     * @param {object} params - The transcription parameters.
     * @param {string} params.base64Audio - The base64-encoded audio data.
     * @param {string} params.mimeType - The MIME type of the audio.
     * @returns {Promise<string>} - A promise that resolves to the transcribed text.
     */
    async function transcribeAudio({ base64Audio, mimeType }) {
        const { transcription } = await _callApi({ action: 'transcribeAudio', base64Audio, mimeType });
        return transcription;
    }

    // --- Public API ---
    return {
        embedTexts,
        ragAnswer,
        improveWriting,
        analyzeImage,
        transcribeAudio,
    };
})();
