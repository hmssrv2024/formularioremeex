export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // Simple test endpoint
    if (url.pathname === "/api/hello") {
      return new Response("Hello from Cloudflare Workers!", { headers });
    }

    // Example: PATCH /api/session/<id>
    if (url.pathname.startsWith("/api/session/") && request.method === "PATCH") {
      const id = url.pathname.split("/").pop();
      let data = {};
      try {
        data = await request.json();
      } catch (e) {
        // ignore parse error
      }
      const responseData = { id, received: data, ok: true };
      return new Response(JSON.stringify(responseData), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404, headers });
  },
};
