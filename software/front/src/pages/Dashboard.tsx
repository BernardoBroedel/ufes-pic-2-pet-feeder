import { useState, useEffect } from "react";
import { Wifi, Battery, Clock, Utensils, AlertCircle, WifiOff } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { API_BASE_URL } from "@/lib/api";
import { socket } from "@/lib/socket";
import "./Dashboard.css";

// Mocks
const consumptionData = [
  { name: "Seg", mingau: 120, luna: 90 },
  { name: "Ter", mingau: 115, luna: 95 },
  { name: "Qua", mingau: 130, luna: 85 },
  { name: "Qui", mingau: 110, luna: 100 },
  { name: "Sex", mingau: 130, luna: 80 },
  { name: "Sáb", mingau: 120, luna: 90 },
  { name: "Dom", mingau: 118, luna: 92 },
];

const recentActivities = [
  { id: 1, type: "feeding", pet: "Mingau", time: "07:15", amount: "38g", icon: "Utensils" },
  { id: 2, type: "feeding", pet: "Luna", time: "07:05", amount: "42g", icon: "Utensils" },
  { id: 3, type: "system", title: "Sistema", time: "02:00", description: "Reabastecimento detectado", icon: "AlertCircle" },
  { id: 4, type: "feeding", pet: "Mingau", time: "Ontem, 19:20", amount: "40g", icon: "Utensils" },
  { id: 5, type: "feeding", pet: "Luna", time: "Ontem, 19:05", amount: "35g", icon: "Utensils" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="intro" style={{ color: entry.color }}>
            {entry.name === "mingau" ? "Mingau" : "Luna"} : {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const [nextMeal, setNextMeal] = useState<{ time: string; details: string } | null>(null);
  const [foodLevel, setFoodLevel] = useState(45); // Inicial
  const [deviceStatus, setDeviceStatus] = useState("Conectando...");
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Escuta mudanças de conectividade geral da ESP32
    const handleStatus = (data: { status: string }) => {
      if (data.status === "conectado") {
        setDeviceStatus("Online");
        setIsOnline(true);
      } else {
        setDeviceStatus("Offline");
        setIsOnline(false);
      }
    };

    // Escuta as mensagens MQTT trafegadas via Socket
    const handleMqttMessage = (data: { topic: string; payload: string }) => {
      if (data.topic === "pet/sensores") {
        try {
          const parsed = JSON.parse(data.payload);
          if (parsed.nivelRacao !== undefined) {
            setFoodLevel(parsed.nivelRacao);
          }
        } catch (e) {
          console.error("Erro ao fazer parse dos sensores:", e);
        }
      }
    };

    socket.on("esp_status", handleStatus);
    socket.on("mqtt_message", handleMqttMessage);

    // Faz fetch do status inicial da API
    fetch(`${API_BASE_URL}/api/status`)
      .then(res => res.json())
      .then(data => {
        if (data.esp === "conectado") {
          setDeviceStatus("Online");
          setIsOnline(true);
        } else {
          setDeviceStatus("Offline");
          setIsOnline(false);
        }
      })
      .catch(() => {
        setDeviceStatus("Offline");
        setIsOnline(false);
      });

    return () => {
      socket.off("esp_status", handleStatus);
      socket.off("mqtt_message", handleMqttMessage);
    };
  }, []);

  useEffect(() => {
    const fetchNextMeal = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/schedules`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
          const schedules = result.data.filter((s: any) => s.enabled);
          if (schedules.length === 0) return;

          const now = new Date();
          const currentHours = now.getHours().toString().padStart(2, '0');
          const currentMinutes = now.getMinutes().toString().padStart(2, '0');
          const currentTime = `${currentHours}:${currentMinutes}`;

          // Sort schedules
          schedules.sort((a: any, b: any) => a.time.localeCompare(b.time));

          // Find the first meal that happens after current time
          let upcoming = schedules.find((s: any) => s.time >= currentTime);
          
          // If no meal left today, next meal is the first meal of tomorrow
          if (!upcoming) {
            upcoming = schedules[0];
          }

          const targetLabel = upcoming.petTarget === "all" ? "Todos os pets" : upcoming.petTarget;
          setNextMeal({
            time: upcoming.time,
            details: `${targetLabel} • ${upcoming.amountGrams}g`
          });
        }
      } catch (error) {
        console.error("Erro ao buscar próxima refeição:", error);
      }
    };

    fetchNextMeal();
    const interval = setInterval(fetchNextMeal, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Painel de Controle</h1>
        <p>Visão geral do seu sistema PetFeeder.</p>
      </div>

      <div className="dashboard-grid">
        {/* Esquerda: Cards e Gráfico */}
        <div className="dashboard-main">
          {/* Top Cards */}
          <div className="top-cards-row">
            {/* Status do Dispositivo */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-title">Status do Dispositivo</span>
                {isOnline ? (
                  <Wifi size={18} color="#10b981" />
                ) : (
                  <WifiOff size={18} color="#ef4444" />
                )}
              </div>
              <div className="dash-card-value">{deviceStatus}</div>
              <div className="dash-card-subtitle">
                {isOnline ? "Conexão em tempo real" : "Aguardando ESP32..."}
              </div>
            </div>

            {/* Nível de Ração */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-title">Nível de Ração</span>
                <Battery size={18} color={foodLevel > 20 ? "#9ca3af" : "#ef4444"} />
              </div>
              <div className="dash-card-value">{foodLevel}%</div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${foodLevel}%`, 
                    background: foodLevel > 20 ? "#fff" : "#ef4444" 
                  }}
                ></div>
              </div>
              <div className="dash-card-subtitle">Est. {Math.max(1, Math.round((foodLevel / 45) * 3))} dias restantes</div>
            </div>

            {/* Próxima Refeição */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-title">Próxima Refeição</span>
                <Clock size={18} color="#f97316" />
              </div>
              <div className="dash-card-value">{nextMeal ? nextMeal.time : "--:--"}</div>
              <div className="dash-card-subtitle">{nextMeal ? nextMeal.details : "Nenhum agendamento ativo"}</div>
            </div>
          </div>

          {/* Gráfico de Consumo */}
          <div className="dash-card chart-card">
            <div className="chart-header">
              <h2>Consumo Semanal (g)</h2>
              <p>Ingestão diária de ração por pet</p>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={consumptionData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  barSize={24}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#9ca3af", fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    ticks={[0, 35, 70, 105, 140]}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Bar dataKey="mingau" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="luna" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
