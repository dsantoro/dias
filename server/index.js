import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createApp } from "./app.js";
import { createSupabaseStore } from "./database.js";

const root = fileURLToPath(new URL("../", import.meta.url));
try {
  process.loadEnvFile(resolve(root, ".env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const store = createSupabaseStore(process.env);
const app = createApp(store);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve(root, "dist")));
  app.get("/{*path}", (_request, response) =>
    response.sendFile(resolve(root, "dist/index.html")),
  );
}

const port = Number(process.env.API_PORT ?? 3001);
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`API Supabase: http://127.0.0.1:${port}`);
});

function stop() {
  server.close(() => {
    process.exit(0);
  });
  server.closeIdleConnections();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
