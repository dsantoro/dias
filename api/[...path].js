import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/app.js";
import { createSupabaseStore } from "../server/database.js";

const root = fileURLToPath(new URL("../", import.meta.url));
try {
  process.loadEnvFile(resolve(root, ".env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const handler =
  !process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY
    ? (_request, response) => {
        response.statusCode = 503;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(
          JSON.stringify({
            error:
              "Configure SUPABASE_URL e SUPABASE_SECRET_KEY nas Environment Variables da Vercel e faça um novo deploy.",
          }),
        );
      }
    : createApp(createSupabaseStore(process.env));

export default handler;
