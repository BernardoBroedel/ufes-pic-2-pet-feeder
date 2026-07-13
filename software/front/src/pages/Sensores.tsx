import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";
import { API_BASE_URL } from "@/lib/api";
import { Activity, Scale, Wifi } from "lucide-react";
import "./Sensores.css";

export function Sensores() {
  const [deviceStatus, setDeviceStatus] = useState("Offline");
  const [isOnline, setIsOnline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("--:--");

  // Sensores State
  const [bowlWeight, setBowlWeight] = useState<number>(0);

  useEffect(() => {
    const handleStatus = (data: { status: string }) => {
      setIsOnline(data.status === "conectado");
      setDeviceStatus(data.status === "conectado" ? "Online" : "Offline");
    };

    const handleMqttMessage = (data: { topic: string; payload: string }) => {
      if (data.topic === "pet/sensores" || data.topic === "pet/peso") {
        try {
          const parsed = JSON.parse(data.payload);
          
          if (parsed.peso !== undefined) setBowlWeight(parsed.peso);
          else if (parsed.pesoTigela !== undefined) setBowlWeight(parsed.pesoTigela);

          const now = new Date();
          setLastUpdate(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
        } catch (e) {
          console.error("Erro no parse dos sensores:", e);
        }
      }
    };

    socket.on("esp_status", handleStatus);
    socket.on("mqtt_message", handleMqttMessage);

    // Initial fetch
    fetch(`${API_BASE_URL}/api/status`)
      .then((res) => res.json())
      .then((data) => {
        setIsOnline(data.esp === "conectado");
        setDeviceStatus(data.esp === "conectado" ? "Online" : "Offline");
      })
      .catch(() => setIsOnline(false));

    return () => {
      socket.off("esp_status", handleStatus);
      socket.off("mqtt_message", handleMqttMessage);
    };
  }, []);

  return (
    <div className="sensores-container">
      <div className="sensores-header">
        <h1>Sensores e Telemetria</h1>
        <p>Leitura de dados do hardware em tempo real (via WebSocket).</p>
      </div>

      <div className="sensores-grid">
        {/* Card: Status da Conexão */}
        <div className="sensor-card" style={{ "--sensor-color": isOnline ? "#10b981" : "#ef4444" } as any}>
          <div className="sensor-header">
            <div className="sensor-icon-wrapper">
              <Wifi size={20} color={isOnline ? "#10b981" : "#ef4444"} />
            </div>
            <span className="sensor-title">ESP32 Conexão</span>
            <span className={`sensor-status ${isOnline ? 'status-active' : 'status-inactive'}`}>
              {deviceStatus}
            </span>
          </div>
          <div className="sensor-value-container">
            <span className="sensor-value">{isOnline ? "ON" : "OFF"}</span>
          </div>
          <div className="sensor-footer">
            <span>Latência via WebSocket</span>
            <span>{isOnline ? "< 10ms" : "N/A"}</span>
          </div>
        </div>

        {/* Card: Balança da Tigela */}
        <div className="sensor-card" style={{ "--sensor-color": "#f59e0b" } as any}>
          <div className="sensor-header">
            <div className="sensor-icon-wrapper">
              <Scale size={20} color="#f59e0b" />
            </div>
            <span className="sensor-title">Peso na Tigela</span>
            <span className={`sensor-status ${isOnline ? 'status-active' : 'status-inactive'}`}>
              Célula de Carga
            </span>
          </div>
          <div className="sensor-value-container">
            <span className="sensor-value">{bowlWeight}</span>
            <span className="sensor-unit">g</span>
          </div>
          <div className="sensor-footer">
            <span>Última leitura</span>
            <span>{lastUpdate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
