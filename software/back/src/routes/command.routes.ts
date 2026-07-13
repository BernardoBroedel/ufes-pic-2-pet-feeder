import { Router } from "express";
import type { Request, Response } from "express";
import http from "http";
import { sendToEsp32, getWsEspConnected, getWsEspIp } from "../ws/ws-server.js";

export const commandRouter = Router();

/**
 * POST /api/comando
 * Envia um comando para a ESP32 via MQTT.
 * Body esperado: { "acao": "alimentar" | "status" | string }
 */
commandRouter.post("/comando", (req: Request, res: Response): void => {
  const { acao } = req.body as { acao?: string };

  if (!acao) {
    res.status(400).json({ success: false, error: "Campo 'acao' é obrigatório." });
    return;
  }

  sendToEsp32({ acao, timestamp: Date.now() });

  console.log(`Botão clicado — comando enviado: ${acao}`);
  res.json({ success: true, message: `Comando '${acao}' enviado para a ESP32.` });
});

/**
 * POST /api/velocidade
 * Define a velocidade de rotação do motor (RPM).
 * Body esperado: { "rpm": number } — valor entre 1 e 200.
 */
commandRouter.post("/velocidade", (req: Request, res: Response): void => {
  const { rpm } = req.body as { rpm?: number };

  if (rpm === undefined || typeof rpm !== "number") {
    res.status(400).json({ success: false, error: "Campo 'rpm' (number) é obrigatório." });
    return;
  }

  if (rpm < 1 || rpm > 200) {
    res.status(400).json({ success: false, error: "RPM deve estar entre 1 e 200." });
    return;
  }

  sendToEsp32({ acao: `velocidade_${rpm}`, timestamp: Date.now() });

  console.log(`Velocidade alterada — comando enviado: velocidade_${rpm}`);
  res.json({ success: true, message: `Velocidade definida para ${rpm} RPM.` });
});

/**
 * GET /api/status
 * Retorna o estado da conexão MQTT.
 */
commandRouter.get("/status", (_req: Request, res: Response): void => {
  res.json({
    mqtt: "conectado",
    esp: getWsEspConnected() ? "conectado" : "desconectado",
    espIp: getWsEspIp(),
  });
});

// Proxy para buscar a foto atual da câmera (Snapshot)
commandRouter.get("/capture", (req: Request, res: Response) => {
  const espIp = getWsEspIp();
  if (!espIp || !getWsEspConnected()) {
    res.status(404).send("ESP32 Offline");
    return;
  }

  const captureUrl = `http://${espIp}/capture`;
  
  const proxyReq = http.get(captureUrl, (proxyRes) => {
    // Repassa todos os cabeçalhos originais
    if (!res.headersSent) {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    }
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("[PROXY] Erro ao conectar na câmera:", err.message);
    if (!res.headersSent) {
      res.status(500).send("Erro no proxy da câmera");
    }
  });
  
  // Se o frontend fechar a conexão, aborta o proxy para não pendurar a ESP32
  req.on("close", () => {
    proxyReq.destroy();
  });
});
