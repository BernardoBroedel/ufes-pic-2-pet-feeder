# 💻 Software — PetFeeder Stack

Este diretório contém toda a stack de software do sistema: banco de dados, API backend e interface frontend.

---

## 📂 Estrutura

```
software/
├── docker-compose.yml       # Infraestrutura (PostgreSQL + PGAdmin)
├── back/                    # API Backend
│   ├── src/
│   │   ├── index.ts         # Entry point (Express + Socket.io + WebSocket)
│   │   ├── db/
│   │   │   ├── connection.ts
│   │   │   └── schema.ts    # Tabelas: feeding_schedules, pets
│   │   ├── routes/
│   │   │   ├── command.routes.ts   # Comandos p/ ESP32
│   │   │   ├── schedule.routes.ts  # CRUD de agendamentos
│   │   │   └── pets.routes.ts      # CRUD de pets
│   │   └── ws/
│   │       └── ws-server.ts        # WebSocket Server (ESP32 ↔ Backend)
│   ├── drizzle/             # Migrations SQL geradas
│   ├── drizzle.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                 # Variáveis de ambiente (gitignored)
│   └── .env.example         # Modelo de referência para o .env
└── front/                   # Painel Frontend
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── pages/           # Dashboard, Camera, Agenda, Sensores, MeusPets...
    │   ├── components/      # Layout, Sidebar, UI (shadcn/ui)
    │   └── lib/
    │       ├── api.ts       # Base URL do backend
    │       └── socket.ts    # Conexão Socket.io
    ├── public/
    ├── index.html
    ├── vite.config.ts
    └── package.json
```

---

## ⚡ Quickstart

> **Pré-requisito:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) e [Node.js 18+](https://nodejs.org/) instalados.

```bash
# 1. Subir o banco de dados
docker-compose up -d

# 2. Backend
cd back
npm install
npm run db:generate   # primeira vez
npm run db:migrate    # primeira vez
npm run dev

# 3. Frontend (outro terminal)
cd front
npm install
npm run dev
```

Acesse **http://localhost:5173** no navegador.

---

## 🐘 Banco de Dados (Docker)

O `docker-compose.yml` levanta dois containers:

| Serviço         | Imagem               | Porta externa | Descrição                          |
|-----------------|----------------------|---------------|------------------------------------|
| **db**          | `postgres:16-alpine` | `5435`        | Banco PostgreSQL                   |
| **pgadmin**     | `dpage/pgadmin4`     | `5054`        | Interface visual para o banco      |

### Credenciais

| Serviço          | Acesso                          | Usuário              | Senha           |
|------------------|---------------------------------|----------------------|-----------------|
| **PostgreSQL**   | `localhost:5435`                | `pet_user`           | `pet_password`  |
| **PGAdmin**      | `http://localhost:5054`         | `admin@petfeeder.com`| `admin`         |

> **Dica:** No PGAdmin, ao registrar o servidor, use o hostname `db` (nome do container) e a porta `5432` (interna).

### Comandos úteis

```bash
docker-compose up -d     # Subir containers
docker-compose down      # Parar e remover containers
docker-compose logs db   # Ver logs do banco
```

---

## 🔧 Backend (`back/`)

API construída com **Express + TypeScript**, usando **Drizzle ORM** para persistência e **WebSockets** para comunicação em tempo real com a ESP32.

### Tech Stack

| Tecnologia     | Versão | Uso                                        |
|----------------|--------|---------------------------------------------|
| **Node.js**    | 18+    | Runtime                                     |
| **Express**    | 5.x    | Framework HTTP                              |
| **TypeScript** | 6.x    | Tipagem estática                            |
| **Drizzle ORM**| 0.45+  | ORM + migrations para PostgreSQL            |
| **Socket.io**  | 4.x    | Comunicação em tempo real com o Frontend     |
| **ws**         | 8.x    | WebSocket nativo para comunicação com ESP32  |
| **tsx**        | 4.x    | Execução direta de TypeScript (dev server)   |

### Variáveis de ambiente (`.env`)

Copie o arquivo de exemplo e ajuste se necessário:

```bash
cp .env.example .env
```

Conteúdo padrão:
DATABASE_URL=postgres://pet_user:pet_password@localhost:5435/petfeeder
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
```

### Scripts disponíveis

| Script            | Comando               | Descrição                              |
|-------------------|-----------------------|----------------------------------------|
| `npm run dev`     | `tsx watch src/index.ts` | Inicia em modo dev com hot-reload    |
| `npm run build`   | `tsc`                 | Compila para JavaScript                |
| `npm run db:generate` | `drizzle-kit generate` | Gera migrations a partir do schema |
| `npm run db:migrate`  | `drizzle-kit migrate`  | Aplica migrations no banco           |
| `npm run db:studio`   | `drizzle-kit studio`   | Abre interface visual do Drizzle     |

### Endpoints da API

#### Comandos — `command.routes.ts`

| Método | Rota            | Body                    | Descrição                         |
|--------|-----------------|-------------------------|-----------------------------------|
| POST   | `/api/comando`  | `{ acao: string }`      | Envia comando para a ESP32        |
| POST   | `/api/velocidade` | `{ rpm: number }`     | Define RPM do motor (1–200)       |
| GET    | `/api/status`   | —                       | Status da conexão ESP32           |
| GET    | `/api/capture`  | —                       | Proxy da câmera (snapshot JPEG)   |

#### Agendamentos — `schedule.routes.ts`

| Método | Rota                          | Body                                         | Descrição                      |
|--------|-------------------------------|----------------------------------------------|--------------------------------|
| GET    | `/api/schedules`              | —                                            | Lista todos os agendamentos    |
| POST   | `/api/schedules`              | `{ time, amountGrams, petTarget? }`          | Cria novo agendamento          |
| PUT    | `/api/schedules/:id`          | `{ time, amountGrams, petTarget? }`          | Atualiza agendamento           |
| PATCH  | `/api/schedules/:id/toggle`   | —                                            | Liga/desliga agendamento       |
| DELETE | `/api/schedules/:id`          | —                                            | Remove agendamento             |
| POST   | `/api/feed-now`               | `{ amountGrams: number }`                    | Alimentação manual imediata    |

#### Pets — `pets.routes.ts`

| Método | Rota             | Body                                                          | Descrição         |
|--------|------------------|---------------------------------------------------------------|-------------------|
| GET    | `/api/pets`      | —                                                             | Lista todos os pets |
| POST   | `/api/pets`      | `{ name, ageText?, weightKg?, dailyGoalKcal?, avatarBase64? }`| Cria novo pet     |
| PUT    | `/api/pets/:id`  | *(mesmos campos)*                                             | Atualiza pet      |
| DELETE | `/api/pets/:id`  | —                                                             | Remove pet        |

### Protocolo WebSocket (ESP32 ↔ Backend)

O backend escuta conexões WebSocket na rota `/esp32` (porta 3001). A ESP32 conecta e envia:

- `{"peso": 123.4}` — peso lido pela célula de carga
- `{"status": "online"}` — heartbeat de status

O backend retransmite os dados para o frontend via **Socket.io** nos eventos:
- `mqtt_message` — dados de peso
- `esp_status` — status de conexão

---

## 🎨 Frontend (`front/`)

Painel administrativo construído com **React + Vite + TailwindCSS**, com detecção de pets por IA diretamente no navegador.

### Tech Stack

| Tecnologia          | Versão | Uso                                             |
|---------------------|--------|--------------------------------------------------|
| **React**           | 19.x   | Framework de UI                                  |
| **Vite**            | 8.x    | Bundler e dev server                             |
| **TypeScript**      | 6.x    | Tipagem estática                                 |
| **TailwindCSS**     | 4.x    | Estilização utilitária                           |
| **TensorFlow.js**   | 4.x    | Inferência de IA no navegador                    |
| **COCO-SSD**        | 2.x    | Modelo de detecção de objetos (detecta o pet)    |
| **Socket.io Client**| 4.x    | Comunicação em tempo real com o Backend           |
| **Recharts**        | 3.x    | Gráficos de consumo                              |
| **Radix UI**        | 1.x    | Componentes UI acessíveis (via shadcn/ui)        |
| **React Router**    | 7.x    | Navegação entre páginas                          |

### Páginas

| Página         | Arquivo           | Descrição                                                |
|----------------|-------------------|----------------------------------------------------------|
| **Dashboard**  | `Dashboard.tsx`   | Visão geral: peso, reservatório virtual, timeline         |
| **Câmera**     | `Camera.tsx`      | Stream ao vivo + detecção de pet por IA (COCO-SSD)        |
| **Agenda**     | `Agenda.tsx`      | CRUD de agendamentos de alimentação automática             |
| **Sensores**   | `Sensores.tsx`    | Dados em tempo real da balança e status da ESP32           |
| **Meus Pets**  | `MeusPets.tsx`    | Cadastro e gerenciamento de pets                           |
| **Operacional**| `Operacional.tsx` | Controles avançados do motor e configurações               |

### Variáveis de ambiente

O frontend usa a variável `VITE_API_URL` para definir a URL do backend. O padrão é `http://localhost:3001`:

```env
# Criar arquivo .env na pasta front/ (opcional)
VITE_API_URL=http://localhost:3001
```

### Scripts disponíveis

| Script            | Comando                     | Descrição                           |
|-------------------|-----------------------------|-------------------------------------|
| `npm run dev`     | `vite`                      | Inicia dev server (hot-reload)      |
| `npm run build`   | `tsc -b && vite build`      | Build de produção                   |
| `npm run lint`    | `eslint .`                  | Verifica estilo de código           |
| `npm run preview` | `vite preview`              | Serve o build de produção localmente|

---

## 🐛 Troubleshooting

| Problema                                      | Solução                                                                               |
|-----------------------------------------------|---------------------------------------------------------------------------------------|
| **`docker-compose up` falha**                 | Verifique se o Docker Desktop está rodando                                             |
| **Backend não conecta no banco**              | Confirme que os containers estão up (`docker ps`) e que a porta 5435 está livre        |
| **Frontend mostra "Backend offline"**         | Verifique se o backend está rodando na porta 3001                                      |
| **Migrations falham**                         | Rode `docker-compose down -v` para limpar volumes e suba novamente                     |
| **CORS error no navegador**                   | O backend já permite `http://localhost:5173` — verifique se está acessando desta URL   |
| **TensorFlow.js lento na primeira carga**     | Normal — o modelo COCO-SSD (~5MB) é baixado na primeira vez e fica em cache do browser |
