import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const children = [
  spawn(process.execPath, ["--watch", "server/index.js"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  }),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", ...process.argv.slice(2)],
    { cwd: root, stdio: "inherit", env: process.env },
  ),
];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) child.kill("SIGTERM");
}

for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
