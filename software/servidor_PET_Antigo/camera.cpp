#include "esp_camera.h"
#include <WiFi.h>

// 1. Substitua pelas suas credenciais de Wi-Fi
const char* ssid = "Archanji";
const char* password = "olYc&bul44";

// 2. O IP do seu computador 
String serverName = "192.168.0.99"; 
String serverPath = "/predict";
const int serverPort = 5000;

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

void setup() {
  Serial.begin(115200);
  
  // Conecta ao Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Conectado!");

  // Configuração inicial da Câmera
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
  
  // Resolução: QVGA (320x240) é ótimo para IA e leve para enviar por Wi-Fi
  config.frame_size = FRAMESIZE_QVGA; 
  config.jpeg_quality = 12;
  config.fb_count = 1;

  // Inicializa a câmera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Erro ao iniciar a camera: 0x%x", err);
    return;
  }
}

void sendPhoto() {
  // Captura a imagem
  camera_fb_t * fb = NULL;
  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Falha ao capturar a imagem da camera");
    return;
  }

  WiFiClient client;
  Serial.println("Tentando conectar ao servidor Python...");
  
  if (client.connect(serverName.c_str(), serverPort)) {
    Serial.println("Conectado! Enviando foto...");

    // Estrutura de dados para envio de arquivo via POST HTTP (multipart/form-data)
    String head = "--ESP32Boundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"esp32cam.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
    String tail = "\r\n--ESP32Boundary--\r\n";

    uint32_t totalLen = fb->len + head.length() + tail.length();

    // 1. Envia os cabeçalhos (Headers)
    client.println("POST " + serverPath + " HTTP/1.1");
    client.println("Host: " + serverName);
    client.println("Content-Length: " + String(totalLen));
    client.println("Content-Type: multipart/form-data; boundary=ESP32Boundary");
    client.println();
    
    // 2. Envia o texto de abertura
    client.print(head);
    
    // 3. Envia a imagem em pequenos pacotes (para não estourar a RAM)
    uint8_t *fbBuf = fb->buf;
    size_t fbLen = fb->len;
    for (size_t n = 0; n < fbLen; n = n + 1024) {
      if (n + 1024 < fbLen) {
        client.write(fbBuf, 1024);
        fbBuf += 1024;
      } else if (fbLen % 1024 > 0) {
        size_t remainder = fbLen % 1024;
        client.write(fbBuf, remainder);
      }
    }
    
    // 4. Envia o texto de encerramento
    client.print(tail);

    // 5. Lê a resposta do seu servidor Python (o JSON com o Gato_A ou Gato_B)
    Serial.print("Resposta da IA: ");
    while (client.connected()) {
      String line = client.readStringUntil('\n');
      if (line == "\r") { break; } // Pula os cabeçalhos da resposta
    }
    String body = client.readStringUntil('\n'); // Lê o JSON final
    Serial.println(body);
    
  } else {
    Serial.println("Falha ao conectar no servidor Python. Verifique o IP e o Wi-Fi!");
  }
  
  // Limpa a memória para a próxima foto
  esp_camera_fb_return(fb);
}

void loop() {
  // Tira uma foto e envia a cada 5 segundos para testes
  sendPhoto();
  delay(5000); 
}