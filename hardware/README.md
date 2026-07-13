# 🔧 Firmware — ESP32-CAM (PetFeeder)

Este diretório contém o firmware completo da **ESP32-CAM** (modelo AI Thinker), responsável por:

- 📷 Capturar e transmitir o stream de vídeo da câmera via HTTP (porta 80)
- ⚖️ Ler o peso da ração no prato através da célula de carga (HX711)
- ⚙️ Controlar o motor de passo (NEMA 17) para liberar ração
- 🔌 Comunicar-se com o Backend via **WebSocket** para enviar dados e receber comandos

---

## 📋 Pré-requisitos

| Ferramenta        | Versão     | Download / Referência                                                        |
|-------------------|------------|------------------------------------------------------------------------------|
| **Arduino IDE**   | 2.x+       | [arduino.cc/en/software](https://www.arduino.cc/en/software)                |
| **Placa ESP32**   | —          | Adicionar via Gerenciador de Placas (veja instruções abaixo)                 |
| **Cabo USB**      | —          | Micro-USB ou USB-C (dependendo do módulo programador)                        |

---

## ⚡ Configuração da Arduino IDE

### 1. Adicionar suporte à placa ESP32

1. Abra a Arduino IDE e vá em **Arquivo → Preferências**.
2. No campo **URLs Adicionais para Gerenciadores de Placas**, adicione:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Vá em **Ferramentas → Placa → Gerenciador de Placas**.
4. Pesquise por **esp32** e instale o pacote **"esp32" por Espressif Systems**.

### 2. Selecionar a placa correta

Em **Ferramentas → Placa**, selecione:

```
AI Thinker ESP32-CAM
```

### 3. Configurações de Upload recomendadas

| Configuração          | Valor recomendado        |
|-----------------------|--------------------------|
| **Board**             | AI Thinker ESP32-CAM     |
| **Upload Speed**      | 115200                   |
| **Flash Frequency**   | 80MHz                    |
| **Partition Scheme**  | Huge APP (3MB No OTA)    |

---

## 📦 Bibliotecas Necessárias

Instale as seguintes bibliotecas pelo **Gerenciador de Bibliotecas** da Arduino IDE (**Ferramentas → Gerenciar Bibliotecas**):

| Biblioteca                 | Autor             | Uso no projeto                                                      |
|----------------------------|--------------------|---------------------------------------------------------------------|
| **WebSockets**             | Markus Sattler     | Comunicação bidirecional em tempo real com o Backend (porta 3001)   |
| **HX711**                  | Bogdan Necula      | Leitura de precisão da célula de carga (sensor de peso)             |
| **Stepper** *(built-in)*   | Arduino            | Controle do motor de passo NEMA 17 via driver L298N                 |

> **Nota:** As bibliotecas `esp_camera.h`, `esp_http_server.h`, `WiFi.h` e `Stepper.h` já estão inclusas no pacote de placas ESP32 da Espressif. **Não é necessário instalá-las separadamente.**

---

## 🔌 Pinagem Utilizada

### Câmera (AI Thinker — padrão)

| Função   | GPIO |
|----------|------|
| PWDN     | 32   |
| RESET    | -1   |
| XCLK     | 0    |
| SIOD     | 26   |
| SIOC     | 27   |
| Y9–Y2    | 35, 34, 39, 36, 21, 19, 18, 5 |
| VSYNC    | 25   |
| HREF     | 23   |
| PCLK     | 22   |

### Balança (HX711)

| Função   | GPIO |
|----------|------|
| DT       | 4    |
| SCK      | 2    |

### Motor de Passo (L298N)

| Função   | GPIO |
|----------|------|
| IN1      | 12   |
| IN2      | 13   |
| IN3      | 14   |
| IN4      | 15   |

---

## ✏️ Configuração Obrigatória no Código

Antes de fazer o upload, abra o arquivo `esp32-cam-full-code.ino` e configure as **três variáveis** no topo do arquivo:

```cpp
// 1. Substitua pelas suas credenciais de Wi-Fi
const char* ssid = "Nome_Do_Seu_WiFi";
const char* password = "Senha_Do_Seu_WiFi";

// 2. IP do computador que roda o Backend (na mesma rede)
const char* wsServerIP = "SEU_IP_AQUI";
```

**Como descobrir o IP do seu computador:**
- **Windows:** Execute `ipconfig` no terminal e procure o endereço **IPv4** do seu adaptador de rede.
- **Linux/macOS:** Execute `ip addr` ou `ifconfig`.

> O Backend deve estar rodando em `http://<SEU_IP>:3001` na mesma rede Wi-Fi da ESP32.

---

## 🚀 Upload do Firmware

A ESP32-CAM **não possui USB integrado** — ela precisa de um módulo programador (FTDI ou similar).

### Passo a passo:

1. **Conecte o módulo FTDI** à ESP32-CAM:

   | FTDI     | ESP32-CAM |
   |----------|-----------|
   | GND      | GND       |
   | 5V       | 5V        |
   | TX       | U0R       |
   | RX       | U0T       |

2. **Coloque a placa em modo de gravação:** Conecte o pino **`IO0`** ao **`GND`** (jumper wire).

3. **Pressione o botão RESET** da ESP32-CAM (ou desconecte e reconecte a alimentação).

4. Na Arduino IDE, selecione a **porta COM** correta em **Ferramentas → Porta**.

5. Clique em **Upload** (➡️).

6. Após o upload terminar com sucesso:
   - **Remova o jumper** entre `IO0` e `GND`.
   - **Pressione RESET** novamente para iniciar o firmware normalmente.

7. Abra o **Monitor Serial** (115200 baud) para acompanhar:
   - Conexão ao Wi-Fi
   - IP atribuído à ESP32 (para acesso ao stream: `http://<IP_DA_ESP>/stream`)
   - Status da conexão WebSocket com o Backend

---

## 📡 Comandos WebSocket (recebidos do Backend)

O firmware escuta os seguintes comandos enviados pelo Backend via WebSocket:

| Comando                  | Ação                                                      |
|--------------------------|-----------------------------------------------------------|
| `motor_ligar`            | Liga o motor de passo (começa a girar)                    |
| `motor_desligar`         | Desliga o motor de passo                                  |
| `motor_inverter`         | Inverte a direção de rotação do motor                     |
| `delay_ligar`            | Ativa delay de 1s entre ciclos do loop                    |
| `delay_desligar`         | Remove o delay entre ciclos                               |
| `antiobstrucao_ligar`    | Ativa estratégia anti-obstrução (gira 3x, volta 1x, repete) |
| `antiobstrucao_desligar` | Desativa estratégia anti-obstrução                        |
| `velocidade_XX`          | Altera RPM do motor (1–200), ex: `velocidade_120`         |

### Dados enviados pela ESP32 → Backend

| Dado                     | Formato JSON                        | Frequência       |
|--------------------------|--------------------------------------|------------------|
| Peso da balança          | `{"peso": 123.4}`                   | A cada ciclo do loop |
| Status de conexão        | `{"status": "online"}`              | A cada 10 segundos   |

---

## 🐛 Troubleshooting

| Problema                                    | Solução                                                                                   |
|---------------------------------------------|-------------------------------------------------------------------------------------------|
| **Upload falha com timeout**                | Verifique se `IO0` está conectado ao `GND` e pressione RESET antes do upload              |
| **Camera init failed (0x20001)**            | Verifique se selecionou **AI Thinker ESP32-CAM** como placa                                |
| **Balança não encontrada**                  | Verifique as conexões dos pinos DT (GPIO 4) e SCK (GPIO 2) do módulo HX711               |
| **WebSocket não conecta**                   | Confirme que o Backend está rodando e que o IP no código está correto                      |
| **Stream não abre no navegador**            | Acesse `http://<IP_DA_ESP>/stream` — verifique se a ESP está na mesma rede                |
| **Motor não gira**                          | Verifique alimentação do L298N (12V) e conexões dos pinos IN1–IN4                         |
