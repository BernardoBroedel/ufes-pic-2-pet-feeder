import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import type { Request, Response } from "express";
import { initWsServer } from "./ws/ws-server.js";
import { commandRouter } from "./routes/command.routes.js";
import { scheduleRouter } from "./routes/schedule.routes.js";
import { petsRouter } from "./routes/pets.routes.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  },
});

const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: "50mb" }));
app.use(cors({ origin: "http://localhost:5173" }));

// Gerenciamento simples de conexões do socket.io
io.on("connection", (socket) => {
  console.log(`[Socket.io] Cliente conectado: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
  });
});

// Rotas
app.get("/", (_req: Request, res: Response): void => {
  res.json({ message: "API do backend rodando com Express e TypeScript!" });
});

app.use("/api", commandRouter);
app.use("/api", scheduleRouter);
app.use("/api/pets", petsRouter);

/**
 * Inicializa o servidor Express, WebSocket e MQTT.
 */
function startServer(): void {
  initWsServer(httpServer, io);

  httpServer.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
  });
}

startServer();
