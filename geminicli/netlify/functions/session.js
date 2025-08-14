exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*"
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Extract ID from the path (last segment)
  const pathSegments = event.path.split("/");
  const id = pathSegments[pathSegments.length - 1];

  if (event.httpMethod === "PATCH") {
    let bodyData = {};
    try {
      bodyData = JSON.parse(event.body || '{}');
    } catch (err) {
      return { statusCode: 400, headers, body: 'Invalid JSON' };
    }
    // Placeholder: update session logic here
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, id, received: bodyData })
    };
  }

  if (event.httpMethod === "GET") {
    // Placeholder: fetch session logic here
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id, message: 'Session GET not implemented yet' })
    };
  }

  // Unsupported method
  return {
    statusCode: 405,
    headers,
    body: 'Method Not Allowed'
  };
};
