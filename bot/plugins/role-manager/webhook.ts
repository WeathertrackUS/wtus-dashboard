import http from "node:http";

let server: http.Server | null = null;

export function startSyncWebhook(syncUser: (userId: string) => Promise<void>) {
  const port = Number(process.env.DISCORD_BOT_SYNC_PORT ?? 3001);
  const secret = process.env.DISCORD_BOT_SYNC_SECRET;

  if (!secret) {
    console.log("[SyncWebhook] DISABLED — set DISCORD_BOT_SYNC_SECRET to enable.");
    return;
  }

  if (server) return;

  server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/sync-user") {
      res.writeHead(404);
      res.end();
      return;
    }

    let body = "";
    for await (const chunk of req) body += chunk;

    let data: { userId?: string; secret?: string };
    try {
      data = JSON.parse(body) as { userId?: string; secret?: string };
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    if (data.secret !== secret) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid secret" }));
      return;
    }

    if (!data.userId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing userId" }));
      return;
    }

    try {
      await syncUser(data.userId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (error) {
      console.error("[SyncWebhook] sync failed:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Sync failed" }));
    }
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`[SyncWebhook] Listening on 127.0.0.1:${port}`);
  });
}

export function stopSyncWebhook() {
  if (server) {
    server.close();
    server = null;
  }
}
