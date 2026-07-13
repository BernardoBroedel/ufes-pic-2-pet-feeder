import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/api";
import { socket } from "@/lib/socket";
import "../App.css";

interface CommandResponse {
  success: boolean;
  message: string;
}

interface StatusResponse {
  mqtt: string;
}

export function Operacional() {
  const [motorLigado, setMotorLigado] = useState(false);
  const [delayAtivo, setDelayAtivo] = useState(false);
  const [antiObstrucaoAtivo, setAntiObstrucaoAtivo] = useState(false);
  const [direcaoInvertida, setDirecaoInvertida] = useState(true);
  const [motorRPM, setMotorRPM] = useState(80);
  const [isLoading, setIsLoading] = useState(false);
  const [isDelayLoading, setIsDelayLoading] = useState(false);
  const [isAntiObstrucaoLoading, setIsAntiObstrucaoLoading] = useState(false);
  const [status, setStatus] = useState<string>("Aguardando conexão...");
  const [mqttStatus, setMqttStatus] = useState<string>("desconectado");

  /** Ref para o timer de debounce do slider de velocidade */
  const rpmDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Ao montar o componente, o socket pode estar recém conectado.
    // Escuta eventos de status mqtt vindo do backend
    const onEspStatus = (data: { status: string; error?: string }) => {
      setMqttStatus(data.status);
      if (data.status === "conectado") {
        setStatus("Sistema pronto.");
      } else if (data.error) {
        setStatus(`❌ Erro ESP32: ${data.error}`);
      } else {
        setStatus("Aguardando ESP32...");
      }
    };

    socket.on("esp_status", onEspStatus);

    // Fazemos um fetch inicial apenas para saber o estado assim que abrir a tela
    fetch(`${API_BASE_URL}/api/status`)
      .then(res => res.json())
      .then(data => {
        setMqttStatus(data.esp);
        if (data.esp === "conectado") {
          setStatus("Sistema pronto.");
        } else {
          setStatus("Aguardando ESP32...");
        }
      })
      .catch(() => setMqttStatus("desconectado"));

    return () => {
      socket.off("esp_status", onEspStatus);
    };
  }, []);

  /** Envia comando de ligar/desligar motor via backend → MQTT → ESP32 */
  const handleToggleMotor = async (): Promise<void> => {
    setIsLoading(true);
    const novoEstado = !motorLigado;
    const acao = novoEstado ? "motor_ligar" : "motor_desligar";

    try {
      const response = await fetch(`${API_BASE_URL}/api/comando`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data: CommandResponse = await response.json();
      setMotorLigado(novoEstado);
      setStatus(`✅ ${data.message}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setStatus(`❌ Falha: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  /** Envia comando de ativar/desativar estratégia anti-obstrução via MQTT */
  const handleToggleAntiObstrucao = async (): Promise<void> => {
    setIsAntiObstrucaoLoading(true);
    const novoEstado = !antiObstrucaoAtivo;
    const acao = novoEstado ? "antiobstrucao_ligar" : "antiobstrucao_desligar";

    try {
      const response = await fetch(`${API_BASE_URL}/api/comando`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data: CommandResponse = await response.json();
      setAntiObstrucaoAtivo(novoEstado);
      setStatus(`✅ ${data.message}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setStatus(`❌ Falha: ${errorMessage}`);
    } finally {
      setIsAntiObstrucaoLoading(false);
    }
  };

  /** Envia comando de ativar/desativar delay do loop via MQTT */
  const handleToggleDelay = async (): Promise<void> => {
    setIsDelayLoading(true);
    const novoEstado = !delayAtivo;
    const acao = novoEstado ? "delay_ligar" : "delay_desligar";

    try {
      const response = await fetch(`${API_BASE_URL}/api/comando`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data: CommandResponse = await response.json();
      setDelayAtivo(novoEstado);
      setStatus(`✅ ${data.message}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setStatus(`❌ Falha: ${errorMessage}`);
    } finally {
      setIsDelayLoading(false);
    }
  };
  /** Envia comando de inverter direção via MQTT */
  const handleToggleDirection = async (): Promise<void> => {
    setIsLoading(true);
    const acao = "motor_inverter";

    try {
      const response = await fetch(`${API_BASE_URL}/api/comando`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data: CommandResponse = await response.json();
      setDirecaoInvertida((prev) => !prev);
      setStatus(`✅ ${data.message}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setStatus(`❌ Falha: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };


  /** Envia velocidade do motor com debounce de 300ms */
  const handleRPMChange = (newRPM: number): void => {
    setMotorRPM(newRPM);

    if (rpmDebounceRef.current) {
      clearTimeout(rpmDebounceRef.current);
    }

    rpmDebounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/velocidade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rpm: newRPM }),
        });

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data: CommandResponse = await response.json();
        setStatus(`✅ ${data.message}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";
        setStatus(`❌ Falha: ${errorMessage}`);
      }
    }, 300);
  };

  /** Cleanup do debounce ao desmontar */
  useEffect(() => {
    return () => {
      if (rpmDebounceRef.current) {
        clearTimeout(rpmDebounceRef.current);
      }
    };
  }, []);

  const isConnected = mqttStatus === "conectado";

  return (
    <div className="card">
      <h1>⚙️ Controle Operacional</h1>
      <p className="subtitle">Comandos manuais e configurações do hardware</p>

      <div className="mqtt-indicator">
        <span className={`dot ${isConnected ? "online" : "offline"}`} />
        MQTT: {mqttStatus}
      </div>

      {/* Motor ON/OFF */}
      <button
        type="button"
        className={`action-button ${motorLigado ? "active" : ""}`}
        onClick={handleToggleMotor}
        disabled={isLoading || !isConnected}
        id="btn-toggle-motor"
      >
        {isLoading
          ? "Enviando..."
          : motorLigado
            ? "⏹ Desligar Motor"
            : "▶ Ligar Motor"}
      </button>

      {/* Controles avançados */}
      <div className="controls-section">
        <h2 className="controls-title">Controles Avançados</h2>

        {/* Inverter Direção */}
        <div className="control-row">
          <div className="control-label">
            <span className="control-name">Direção do Motor</span>
            <span className="control-hint">
              {direcaoInvertida ? "Reverso" : "Normal"}
            </span>
          </div>
          <button
            type="button"
            className={`toggle-switch ${direcaoInvertida ? "on" : "off"}`}
            onClick={handleToggleDirection}
            disabled={isLoading || !isConnected}
            aria-label="Toggle direção do motor"
            id="btn-toggle-direction"
          >
            <span className="toggle-thumb" />
          </button>
        </div>

        {/* Toggle de Anti-Obstrução */}
        <div className="control-row">
          <div className="control-label">
            <span className="control-name">Giro Anti-Obstrução</span>
            <span className="control-hint">
              {antiObstrucaoAtivo ? "3 giros frente, 1 ré, 3 giros, 1 ré" : "Giro contínuo padrão"}
            </span>
          </div>
          <button
            type="button"
            className={`toggle-switch ${antiObstrucaoAtivo ? "on" : "off"}`}
            onClick={handleToggleAntiObstrucao}
            disabled={isAntiObstrucaoLoading || !isConnected}
            aria-label="Toggle giro anti-obstrução"
            id="btn-toggle-antiobstrucao"
          >
            <span className="toggle-thumb" />
          </button>
        </div>

        {/* Toggle de Delay */}
        <div className="control-row">
          <div className="control-label">
            <span className="control-name">Delay do Loop</span>
            <span className="control-hint">
              {delayAtivo ? "Pausa de 1s entre ciclos" : "Loop contínuo (sem pausa)"}
            </span>
          </div>
          <button
            type="button"
            className={`toggle-switch ${delayAtivo ? "on" : "off"}`}
            onClick={handleToggleDelay}
            disabled={isDelayLoading || !isConnected}
            aria-label="Toggle delay do loop"
            id="btn-toggle-delay"
          >
            <span className="toggle-thumb" />
          </button>
        </div>

        {/* Slider de Velocidade */}
        <div className="control-row vertical">
          <div className="control-label">
            <span className="control-name">Velocidade do Motor</span>
            <span className="control-hint">{motorRPM} RPM</span>
          </div>
          <div className="slider-container">
            <span className="slider-label">75</span>
            <input
              type="range"
              min="75"
              max="125"
              value={motorRPM}
              onChange={(e) => handleRPMChange(Number(e.target.value))}
              className="rpm-slider"
              disabled={!isConnected}
              id="slider-rpm"
            />
            <span className="slider-label">125</span>
          </div>
        </div>
      </div>

      <p className={`status ${status.startsWith("✅") ? "success" : status.startsWith("❌") ? "error" : ""}`}>
        {status}
      </p>
    </div>
  );
}
