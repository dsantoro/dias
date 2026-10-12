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

const app = createApp(createSupabaseStore(process.env));

export default app;
