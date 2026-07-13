import { useState, useEffect, useRef, useCallback } from "react";
import { Video, Maximize2, Camera as CameraIcon, BrainCircuit, Cat, X } from "lucide-react";
import { socket } from "@/lib/socket";
import { API_BASE_URL } from "@/lib/api";
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import "./Camera.css";

export function Camera() {
  // IP da ESP32 na rede local (ex: 192.168.0.x)
  const [espIp, setEspIp] = useState<string>("192.168.0.");
  
  // AI State e Player
  const imgRef = useRef<HTMLImageElement>(null);
  const [isCat, setIsCat] = useState<boolean | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showCatPopup, setShowCatPopup] = useState(false);
  const popupTimeoutRef = useRef<number | null>(null);

  /** Gera um som de notificação curto usando Web Audio API (sem arquivo externo) */
  const playDetectionSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Primeiro "ding" (nota alta)
      osc.frequency.setValueAtTime(880, ctx.currentTime);        // A5
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1); // Sobe um pouco
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);  // Volta

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.type = "sine";
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Ignora se o browser bloquear o AudioContext
    }
  }, []);

  // Dispara o popup e o som quando a IA detecta um gato
  useEffect(() => {
    if (isCat === true) {
      setShowCatPopup(true);
      playDetectionSound();
      // Limpa timeout anterior se existir
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      // Some após 5 segundos
      popupTimeoutRef.current = window.setTimeout(() => setShowCatPopup(false), 5000);
    }
    return () => {
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, [isCat, playDetectionSound]);

  useEffect(() => {
    // Escuta evento esp_status vindo do broker
    const handleStatus = (data: { status: string; ip?: string }) => {
      if (data.status === "conectado" && data.ip) {
        setEspIp(data.ip);
      }
    };

    socket.on("esp_status", handleStatus);

    // Faz o fetch inicial caso a placa já estivesse online
    fetch(`${API_BASE_URL}/api/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.esp === "conectado" && data.espIp) {
          setEspIp(data.espIp);
        }
      })
      .catch((err) => console.error("Erro ao buscar status:", err));

    // Carrega o modelo de IA e inicia o loop
    let aiInterval: number;
    const loadAi = async () => {
      try {
        await tf.ready();
        const net = await cocossd.load();
        setAiLoading(false);
        console.log("IA Carregada com sucesso!");

        aiInterval = setInterval(async () => {
          if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
            tf.engine().startScope();
            try {
              const predictions = await net.detect(imgRef.current);
              if (predictions.length > 0) {
                console.log("🧐 Predições da IA: ", predictions.map(p => `${p.class} (${Math.round(p.score * 100)}%)`));
              }
              const foundCat = predictions.some(p => p.class === "cat");
              setIsCat(foundCat);
            } catch (err) {
              console.log("Ignorando erro de IA neste frame...", err);
            } finally {
              tf.engine().endScope();
            }
          }
        }, 5000); // Roda a cada 5 segundos para focar no streaming de video
      } catch (err) {
        console.error("Erro ao carregar IA:", err);
        setAiLoading(false);
      }
    };

    loadAi();

    // Loop do Player de Vídeo foi removido pois a tag img nativa agora cuidará do MJPEG contínuo

    return () => {
      socket.off("esp_status", handleStatus);
      if (aiInterval) clearInterval(aiInterval);
    };
  }, []);

  return (
    <div className="camera-container">
      {/* Popup de Detecção de Gato */}
      {showCatPopup && (
        <div className="cat-popup">
          <div className="cat-popup-icon">
            <Cat size={24} />
          </div>
          <div className="cat-popup-content">
            <strong>🐱 Gato Detectado!</strong>
            <span>A IA identificou um gato na câmera agora.</span>
          </div>
          <button className="cat-popup-close" onClick={() => setShowCatPopup(false)}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="camera-header">
        <div className="header-title">
          <h1>Câmera ao Vivo</h1>
          <p>Transmissão em tempo real direto da ESP32 (Modo Local)</p>
        </div>

      </div>



      <div className="camera-player-wrapper">
        <div className="camera-player">
          {espIp.length > 10 && espIp !== "192.168.0." ? (
            <>
              {videoError && (
                <div style={{ position: 'absolute', zIndex: 50, color: 'red', background: 'rgba(0,0,0,0.8)', padding: '1rem', fontWeight: 'bold' }}>
                  {videoError}
                </div>
              )}
              <img 
                ref={imgRef}
                src={`http://${espIp}/stream`}
                alt="Stream da ESP32" 
                className="mjpeg-stream"
                crossOrigin="anonymous"
                onError={(e) => {
                  setVideoError("Falha ao puxar a foto da Placa. Verifique o IP ou abra a URL direto no navegador.");
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  setVideoError(null);
                }}
              />
            </>
          ) : (
            <>
              <Video size={48} className="camera-icon-large" />
              <p>Aguardando conexão automática com a ESP32...</p>
            </>
          )}
          
          <div className="player-controls">
            <span className="live-badge">
              <span className="live-dot"></span>
              AO VIVO
            </span>
            <button className="fullscreen-button">
              <Maximize2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Renderização da Etiqueta de IA abaixo da câmera */}
      <div className="ai-container">
        <div className="ai-header">
          <BrainCircuit size={18} />
          <span>Visão Computacional (IA)</span>
        </div>
        {aiLoading ? (
          <div className="ai-badge loading">Baixando modelo COCO-SSD...</div>
        ) : (espIp.length > 10 && espIp !== "192.168.0.") ? (
          <div className={`ai-badge ${isCat ? 'cat-detected' : 'no-cat'}`}>
            {isCat === null ? "Analisando..." : isCat ? "É Gato" : "Não é Gato"}
          </div>
        ) : (
          <div className="ai-badge inactive">Aguardando câmera...</div>
        )}
      </div>

    </div>
  );
}
