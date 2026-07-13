import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

// "autoConnect: false" allows us to connect manually if we want,
// but setting it to true establishes connection as soon as it's imported.
export const socket = io(API_BASE_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log("🟢 [Socket.io] Conectado ao Backend!", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("🔴 [Socket.io] Erro de conexão:", err.message);
});
