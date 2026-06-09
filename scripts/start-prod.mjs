/**
 * Arranque de producción (Render): levanta los 3 microservicios en puertos
 * internos (localhost) y el api-gateway en $PORT como proceso público.
 * Si cualquier proceso muere, el contenedor sale y Render lo reinicia.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const tsxBin = path.join(root, "node_modules", ".bin", isWindows ? "tsx.cmd" : "tsx");

const processes = [
  { name: "breach", cwd: "services/breach" },
  { name: "analyzer", cwd: "services/analyzer" },
  { name: "alert", cwd: "services/alert" },
  { name: "gateway", cwd: "apps/api-gateway" }
];

const children = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exit(code);
}

for (const { name, cwd } of processes) {
  const child = spawn(tsxBin, ["src/index.ts"], {
    cwd: path.join(root, cwd),
    stdio: "inherit",
    shell: isWindows,
    env: process.env
  });

  child.on("exit", (code) => {
    console.error(`[start-prod] proceso "${name}" terminó con código ${code}`);
    shutdown(code ?? 1);
  });

  children.push(child);
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));
