#include "esp_camera.h"
#include <esp_http_server.h>
#include <WiFi.h>
#include <Stepper.h>
#include <WebSocketsClient.h>
#include "HX711.h"

// 1. Substitua pelas suas credenciais de Wi-Fi
const char* ssid = "";
const char* password = "";

// 2. Configuração do Servidor WebSocket
const char* wsServerIP = "";
const int wsServerPort = 3001;
const char* wsServerPath = "/esp32";

// Pinos da câmera (Padrão para o modelo AI Thinker)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Pinos da Balança (HX711)
#define DT 4
#define SCK 2

HX711 escala;
float fator_calibracao = 1016.19; 

// Quantidade de passos por volta do motor
const int stepsPerRevolution = 200;

// Pinos do motor de passo no ESP32-CAM
#define IN1 12
#define IN2 13
#define IN3 14
#define IN4 15

// Inicializa a biblioteca Stepper
Stepper myStepper(stepsPerRevolution, IN1, IN3, IN2, IN4);

// Estado do motor (ligado/desligado)
bool motorLigado = false;
bool direcaoInvertida = true;

// Controle do delay no loop (pode ser desativado pelo frontend)
bool delayAtivo = false;

// Controle da estratégia anti-obstrução (pode ser desativada pelo frontend)
bool antiObstrucaoAtivo = false;

// Velocidade do motor em RPM (ajustável pelo frontend)
int motorRPM = 80;

// Clientes Wi-Fi e MQTT
WiFiClient espClient;
WebSocketsClient webSocket;
unsigned long lastPing = 0;

// Servidor HTTP para a Câmera
httpd_handle_t camera_httpd = NULL;

#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// Resposta para o Google Chrome liberar o CORS (Preflight OPTIONS)
static esp_err_t options_handler(httpd_req_t *req) {
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, OPTIONS");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "*");
  httpd_resp_send(req, NULL, 0);
  return ESP_OK;
}

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char * part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  // Libera o CORS para a IA do Frontend ler os pixels
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Falha na captura da camera");
      res = ESP_FAIL;
    } else {
      _jpg_buf_len = fb->len;
      _jpg_buf = fb->buf;
    }
    if (res == ESP_OK) {
      size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART, _jpg_buf_len);
      res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }
    if (fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    } else if (_jpg_buf) {
      free(_jpg_buf);
      _jpg_buf = NULL;
    }
    if (res != ESP_OK) break;
  }
  return res;
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  
  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t options_uri = {
    .uri       = "/stream",
    .method    = HTTP_OPTIONS,
    .handler   = options_handler,
    .user_ctx  = NULL
  };
  
  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    httpd_register_uri_handler(camera_httpd, &options_uri);
    Serial.println("Servidor de video iniciado na porta 80");
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Desconectado do servidor!");
      break;
    case WStype_CONNECTED:
      Serial.printf("[WS] Conectado ao url: %s\n", payload);
      webSocket.sendTXT("{\"status\":\"online\"}");
      break;
    case WStype_TEXT:
      {
        String message = "";
        for (size_t i = 0; i < length; i++) {
          message += (char)payload[i];
        }
        Serial.print("[WS] Mensagem recebida: ");
        Serial.println(message);

        if (message.indexOf("motor_ligar") >= 0) {
          motorLigado = true;
          Serial.println("[MOTOR] LIGADO");
        } else if (message.indexOf("motor_desligar") >= 0) {
          motorLigado = false;
          Serial.println("[MOTOR] DESLIGADO");
        } else if (message.indexOf("motor_inverter") >= 0) {
          direcaoInvertida = !direcaoInvertida;
          Serial.println("[MOTOR] Invertido");
        } else if (message.indexOf("delay_ligar") >= 0) {
          delayAtivo = true;
        } else if (message.indexOf("delay_desligar") >= 0) {
          delayAtivo = false;
        } else if (message.indexOf("antiobstrucao_ligar") >= 0) {
          antiObstrucaoAtivo = true;
        } else if (message.indexOf("antiobstrucao_desligar") >= 0) {
          antiObstrucaoAtivo = false;
        } else if (message.indexOf("velocidade_") >= 0) {
          int idx = message.indexOf("velocidade_") + 11;
          int endIdx = idx;
          while (endIdx < (int)message.length() && isDigit(message[endIdx])) {
            endIdx++;
          }
          int novaVelocidade = message.substring(idx, endIdx).toInt();
          if (novaVelocidade >= 1 && novaVelocidade <= 200) {
            motorRPM = novaVelocidade;
            myStepper.setSpeed(motorRPM);
            Serial.printf("[MOTOR] Nova vel: %d\n", motorRPM);
          }
        }
      }
      break;
  }
}

void setup() {
  Serial.begin(115200);

  // Velocidade do motor (RPM)
  myStepper.setSpeed(80);
  Serial.println("Motor de passo iniciado");
  
  // Conecta ao Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Conectado!");
  Serial.print("IP da ESP32: ");
  Serial.println(WiFi.localIP());

  // Configura e conecta ao WebSocket
  webSocket.begin(wsServerIP, wsServerPort, wsServerPath);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  // Inicialização da Câmera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Resolução aumentada
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 10; 
  config.fb_count = 1;
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Erro ao iniciar a camera: 0x%x\n", err);
  } else {
    // Inicia o servidor Web
    startCameraServer();
  }

  // Inicialização da Balança
  escala.begin(DT, SCK);
  Serial.println("Iniciando a balança...");
  
  // Aguarda até 5 segundos para a balança ficar pronta
  int tentativas = 0;
  while (!escala.is_ready() && tentativas < 50) {
    delay(100);
    tentativas++;
  }

  if (escala.is_ready()) {
    escala.set_scale(fator_calibracao); 
    Serial.println("Calculando o Zero (Tara)...");
    escala.tare(20); 
    Serial.println("Balança zerada!");
  } else {
    Serial.println("Erro: Balança não encontrada. Verifique as conexões do HX711.");
  }
}

void desligarMotor() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

void loop() {
  Serial.println("========================================");
  Serial.println("[LOOP] Novo ciclo iniciado");

  // Processa mensagens WebSocket
  webSocket.loop();

  // Envia ping de status a cada 10 segundos
  if (millis() - lastPing > 10000) {
    webSocket.sendTXT("{\"status\":\"online\"}");
    lastPing = millis();
  }

  // Aciona o motor apenas se estiver ligado
  if (motorLigado) {
    int sentido = direcaoInvertida ? -1 : 1;
    
    if (antiObstrucaoAtivo) {
      Serial.println("[MOTOR] Girando motor (Estrategia Anti-Obstrucao)...");
      
      // Realiza 3 giros
      myStepper.step(3 * stepsPerRevolution * sentido);
      
      // Volta 1 giro
      Serial.println("[MOTOR] Voltando 1 giro...");
      myStepper.step(-1 * stepsPerRevolution * sentido);
      
      // Realiza 3 giros novamente
      Serial.println("[MOTOR] Girando mais 3 vezes...");
      myStepper.step(3 * stepsPerRevolution * sentido);
      
      // Volta 1 giro novamente
      Serial.println("[MOTOR] Voltando 1 giro final...");
      myStepper.step(-1 * stepsPerRevolution * sentido);
    } else {
      Serial.println("[MOTOR] Girando motor normalmente...");
      myStepper.step(stepsPerRevolution * sentido);
    }
    
    Serial.println("[MOTOR] Passo concluido. Desligando bobinas para esfriar.");
    //desligarMotor();
  } else {
    Serial.println("[MOTOR] Motor parado (desligado)");
  }

    // Processa WS novamente
    webSocket.loop();

  // Leitura da balança e envio por MQTT
  if (escala.is_ready()) {
    float peso = escala.get_units(10);
    Serial.print("[BALANCA] Peso: ");
    Serial.print(peso, 1); 
    Serial.println(" g");
    
    // Envia o peso no formato JSON para o WebSocket
    String payload = "{\"peso\":" + String(peso, 1) + "}";
    webSocket.sendTXT(payload);
  } else {
    Serial.println("[BALANCA] Erro: Falha na leitura do HX711.");
  }

  // Processa WS mais uma vez
  webSocket.loop();

  if (delayAtivo) {
    Serial.println("[LOOP] Aguardando 1 segundo...");
    delay(1000);
  } else {
    Serial.println("[LOOP] Delay desativado, continuando...");
  }
}
