export interface Env {
  VERSION?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json(
        { status: "ok", version: env.VERSION ?? "0.1.0" },
        {
          headers: { "cache-control": "public, max-age=60" },
        },
      );
    }
    return Response.json({ error: "not_found" }, { status: 404 });
  },
};
