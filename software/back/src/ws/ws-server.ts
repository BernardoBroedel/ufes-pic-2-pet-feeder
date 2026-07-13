import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { Server as SocketIOServer } from "socket.io";

let wss: WebSocketServer | null = null;
let espSocket: WebSocket | null = null;
let isEspConnected = false;
let espIp: string | null = null;

let ioInstance: SocketIOServer | null = null;

export function initWsServer(server: HttpServer, io: SocketIOServer): void {
  ioInstance = io;
  // Initialize the WebSocket server and attach it to the Express HTTP server
  // We use a specific path so it doesn't conflict with socket.io
  wss = new WebSocketServer({ server, path: "/esp32" });

  console.log("[WS] Servidor WebSocket inicializado no caminho /esp32");

  wss.on("connection", (ws, req) => {
    console.log(`[WS] Novo cliente conectado (ESP32): ${req.socket.remoteAddress}`);
    espSocket = ws;
    isEspConnected = true;
    
    // Extract IP cleanly
    const fullIp = req.socket.remoteAddress || "";
    espIp = fullIp.includes("::ffff:") ? fullIp.split("::ffff:")[1] : fullIp;

    // Send status to frontend
    ioInstance?.emit("esp_status", { status: "conectado", ip: espIp });
    ioInstance?.emit("mqtt_status", { status: "conectado" }); // Fake MQTT status to keep frontend happy

    ws.on("message", (data) => {
      const message = data.toString();
      console.log(`\n🛎️ [DEBUG WS] Mensagem recebida: ${message}`);
      
      try {
        const parsed = JSON.parse(message);
        
        // Handle peso
        if (parsed.peso !== undefined) {
          ioInstance?.emit("mqtt_message", { topic: "pet/peso", payload: message });
        }
        
        // Handle status (online/offline)
        if (parsed.status !== undefined) {
          if (parsed.status === "online") {
             isEspConnected = true;
          } else if (parsed.status === "offline") {
             isEspConnected = false;
          }
          ioInstance?.emit("esp_status", { status: isEspConnected ? "conectado" : "desconectado", ip: espIp });
        }
      } catch(e) {
        console.log(`[WS] Mensagem String recebida: ${message}`);
      }
    });

    ws.on("close", () => {
      console.log("[WS] ESP32 Desconectado");
      if (espSocket === ws) {
        espSocket = null;
        isEspConnected = false;
        ioInstance?.emit("esp_status", { status: "desconectado", ip: espIp });
        ioInstance?.emit("mqtt_status", { status: "desconectado" });
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] Erro na conexão:", err.message);
    });
  });
}

export function sendToEsp32(action: string | object): void {
  if (!espSocket || espSocket.readyState !== WebSocket.OPEN) {
    console.error("[WS] ESP32 não está conectado. Mensagem ignorada.");
    return;
  }

  const payload = typeof action === "string" ? action : JSON.stringify(action);
  espSocket.send(payload, (err) => {
    if (err) {
      console.error("[WS] Erro ao enviar mensagem:", err.message);
    } else {
      console.log(`[WS] Mensagem enviada para o ESP32: ${payload}`);
    }
  });
}

export function getWsEspConnected(): boolean {
  return isEspConnected;
}

export function getWsEspIp(): string | null {
  return espIp;
}
