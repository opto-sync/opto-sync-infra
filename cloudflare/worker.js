export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "opto-sync-edge" });
    }
    return fetch(request);
  },
};

