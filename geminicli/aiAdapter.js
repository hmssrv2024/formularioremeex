/**
 * AI Adapter Module
 * Provides a consistent interface for interacting with various AI providers.
 * Default implementation uses Google Gemini.
 *
 * TODO:
 * - Implement robust error handling and logging for API calls.
 * - Add support for other providers like OpenAI.
 * - Implement local embeddings using transformers.js as an alternative path.
 * - Securely manage API keys instead of relying on localStorage for production.
 */
const aiAdapter = (() => {
    let config = {
        provider: 'gemini',
        apiKey: null,
        modelNames: {
            text: 'gemini-1.5-flash', // General purpose model
            embedding: 'text-embedding-004',
            vision: 'gemini-1.5-flash', // Multimodal model
            transcription: 'gemini-1.5-flash' // For audio transcription
        },
        localEmbeddings: false, // Flag to switch between local and remote embeddings
        timeout: 20000 // 20 seconds
    };

    const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

    /**
     * Initializes the AI adapter with provider configuration.
     * @param {object} userConfig - Configuration object.
     */
    function initAI(userConfig) {
        // Prompt for API key if not provided
        const storedApiKey = localStorage.getItem('GEMINI_API_KEY');
        if (userConfig.apiKey) {
            config.apiKey = userConfig.apiKey;
        } else if (storedApiKey) {
            config.apiKey = storedApiKey;
        } else {
            const key = prompt("Please enter your Google Gemini API Key:");
            if (key) {
                config.apiKey = key;
                localStorage.setItem('GEMINI_API_KEY', key);
            } else {
                console.error("API Key is required to use AI features.");
                alert("API Key is required to use AI features.");
                return;
            }
        }
        
        config = { ...config, ...userConfig };
        console.log(`AI Adapter initialized for ${config.provider}.`);
    }

    async function _fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(id);
        return response;
    }

    /**
     * Generates text embeddings for an array of strings.
     * @param {string[]} texts - An array of texts to embed.
     * @returns {Promise<number[][]>} - A promise that resolves to an array of embedding vectors.
     */
    async function embedTexts(texts) {
        if (!config.apiKey) throw new Error("API Key not configured.");
        if (config.localEmbeddings) {
            // TODO: Implement local embeddings with transformers.js
            console.warn("Local embeddings not yet implemented. Falling back to API.");
        }

        const url = `${GEMINI_API_BASE_URL}${config.modelNames.embedding}:batchEmbedContents?key=${config.apiKey}`;
        const requests = texts.map(text => ({
            model: `models/${config.modelNames.embedding}`,
            content: { parts: [{ text }] }
        }));

        try {
            const response = await _fetchWithTimeout(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requests })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Gemini API Error: ${error.error.message}`);
            }

            const data = await response.json();
            return data.embeddings.map(e => e.values);
        } catch (error) {
            console.error("Error in embedTexts:", error);
            throw error;
        }
    }

    /**
     * Generates a response based on a question and context using RAG.
     * @param {object} params - The RAG parameters.
     * @param {string} params.question - The user's question.
     * @returns {Promise<string>} - A promise that resolves to the generated answer.
     */
    async function ragAnswer({ question, contextChunks }) {
        if (!config.apiKey) throw new Error("API Key not configured.");
        
        const context = contextChunks.map(c => c.text).join('

---

');
        const prompt = `Eres un asistente de soporte amable y profesional. Usando el siguiente contexto, responde la pregunta del usuario. Si la respuesta no está en el contexto, indica que no tienes la información.
        
Contexto:
${context}

Pregunta: ${question}

Respuesta:`;

        try {
            return await generateText(prompt);
        } catch (error) {
            console.error("Error in ragAnswer:", error);
            throw error;
        }
    }

    /**
     * Improves a draft message based on a specified tone.
     * @param {object} params - The improvement parameters.
     * @param {string} params.draft - The text to improve.
     * @param {string} params.tone - The desired tone ('claro', 'amable', 'profesional').
     * @returns {Promise<string>} - A promise that resolves to the improved text.
     */
    async function improveWriting({ draft, tone }) {
        if (!config.apiKey) throw new Error("API Key not configured.");
        
        const prompt = `Reformula el siguiente borrador para que suene más ${tone}. Mantén el significado original pero ajusta el estilo.

Borrador: "${draft}"

Versión Mejorada:`;

        try {
            return await generateText(prompt);
        } catch (error) {
            console.error("Error in improveWriting:", error);
            throw error;
        }
    }

    /**
     * Analyzes an image and answers a question about it.
     * @param {object} params - The analysis parameters.
     * @param {Blob} params.blob - The image blob.
     * @param {string} params.question - The question about the image.
     * @returns {Promise<string>} - A promise that resolves to the text analysis.
     */
    async function analyzeImage({ blob, question }) {
        if (!config.apiKey) throw new Error("API Key not configured.");

        const base64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });

        const url = `${GEMINI_API_BASE_URL}${config.modelNames.vision}:generateContent?key=${config.apiKey}`;
        const body = {
            contents: [{
                parts: [
                    { text: question || "Describe esta imagen en detalle." },
                    { inline_data: { mime_type: blob.type, data: base64 } }
                ]
            }]
        };

        try {
            const response = await _fetchWithTimeout(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Gemini API Error: ${error.error.message}`);
            }
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Error in analyzeImage:", error);
            throw error;
        }
    }

    /**
     * Transcribes an audio blob.
     * @param {object} params - The transcription parameters.
     * @param {Blob} params.blob - The audio blob.
     * @returns {Promise<string>} - A promise that resolves to the transcribed text.
     */
    async function transcribeAudio({ blob }) {
        // Note: As of mid-2024, Gemini API for audio transcription is not as direct as vision.
        // This is a conceptual implementation. It might require using a different model or API structure.
        // For now, we use the same multimodal approach as vision.
        console.warn("Audio transcription with Gemini API is experimental.");
        return analyzeImage({ blob, question: "Transcribe el siguiente audio:" });
    }

    /**
     * A generic text generation function.
     * @param {string} prompt - The full prompt for the model.
     * @returns {Promise<string>} - The generated text.
     */
    async function generateText(prompt) {
        const url = `${GEMINI_API_BASE_URL}${config.modelNames.text}:generateContent?key=${config.apiKey}`;
        const body = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        const response = await _fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API Error: ${error.error.message}`);
        }
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    // --- Public API ---
    return {
        initAI,
        embedTexts,
        ragAnswer,
        improveWriting,
        analyzeImage,
        transcribeAudio,
        // Expose config for debugging or advanced use
        getConfig: () => config
    };
})();

// Initialize on load, allowing user to override later.
// In a real app, you might call initAI() after the user logs in or config is loaded.
aiAdapter.initAI({});
