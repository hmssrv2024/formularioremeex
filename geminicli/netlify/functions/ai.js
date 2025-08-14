exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  const { action, ...payload } = data;

  try {
    switch (action) {
      case 'improveWriting': {
        const result = await handleImproveWriting(payload);
        return { statusCode: 200, headers, body: JSON.stringify(result) };
      }
      case 'ragAnswer': {
        const result = await handleRagAnswer(payload);
        return { statusCode: 200, headers, body: JSON.stringify(result) };
      }
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid AI action' })
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

async function handleImproveWriting({ draft, tone }) {
  const prompt = `Reformula el siguiente borrador para que suene más ${tone ?? 'amigable'}. Mantén el significado original pero mejora el estilo: ${draft}`;
  const result = await generateText(prompt);
  return { improvedText: result };
}

async function handleRagAnswer({ question, contextChunks }) {
  const context = Array.isArray(contextChunks)
    ? contextChunks.map((chunk) => chunk.text).join('\n\n---\n\n')
    : '';
  const prompt = `Eres un asistente de soporte amable y servicial. Responde la siguiente pregunta del usuario de acuerdo con el contexto proporcionado. Pregunta: ${question}. Contexto: ${context}`;
  const result = await generateText(prompt);
  return { answer: result };
}

async function generateText(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-1.5-flash';
  const url = `${GEMINI_API_BASE_URL}${model}:generateText?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: {
        text: prompt
      }
    })
  });

  const data = await res.json();
  // Extract text from the API response structure
  const text =
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text;
  return text || '';
}
