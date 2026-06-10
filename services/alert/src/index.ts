import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenv } from "dotenv";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv({ path: path.resolve(__dirname, "../../../.env") });

type AlertPayload = {
  source: string;
  severity: "low" | "medium" | "high";
  title: string;
  summary: string;
  payload?: unknown;
};

type StoredAlert = AlertPayload & {
  id: string;
  createdAt: string;
};

const app = express();
const port = Number(process.env.ALERT_SERVICE_PORT ?? 4103);
const startedAt = Date.now();

const alerts: StoredAlert[] = [];

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "alert-service",
    totalAlerts: alerts.length,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000)
  });
});

app.post("/notify", (req, res) => {
  const body = req.body as AlertPayload;

  if (!body?.source || !body?.severity || !body?.title || !body?.summary) {
    res.status(400).json({ ok: false, error: "Faltan campos obligatorios en la alerta" });
    return;
  }
  if (!["low", "medium", "high"].includes(body.severity)) {
    res.status(400).json({ ok: false, error: "severity inválido" });
    return;
  }

  const alert: StoredAlert = {
    ...body,
    id: `alt_${Date.now()}`,
    createdAt: new Date().toISOString()
  };

  alerts.unshift(alert);
  alerts.splice(20);

  console.log(`[alert-service] ${alert.severity.toUpperCase()} | ${alert.title} | fuente: ${alert.source}`);
  res.json({ ok: true, alertId: alert.id });
});

app.get("/alerts", (_req, res) => {
  res.json({ ok: true, alerts });
});

// Solo loopback: en Render únicamente el api-gateway debe exponerse públicamente
app.listen(port, "127.0.0.1", () => {
  console.log(`[alert-service] corriendo en http://localhost:${port}`);
});
