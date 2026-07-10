# LLM Chat Workspace

A local chat workspace for talking to LLMs through [Ollama](https://ollama.com/) — with **two parallel conversation windows**, so you can send the same prompt to multiple models and compare their responses side by side. Conversations are multi-turn and persist to MySQL.

## Features

- **Multi-model comparison** — run two chat windows in parallel against different Ollama models
- **Multi-turn conversations** — full thread history sent as context on each turn
- **Persistence** — threads and messages stored in MySQL, including provider and response-latency metadata
- **Mock-provider mode** — develop and run tests without a live Ollama instance (`USE_MOCK_PROVIDERS=true`)

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS
- **Database:** MySQL
- **Testing:** Jasmine (unit), Cucumber.js (acceptance), Puppeteer (browser automation)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create/edit `.env` in the project root:

```bash
PORT=3011
DB_HOST=localhost
DB_USER=devuser
DB_PASSWORD=<your_mysql_password>
DB_NAME=llm_site
DB_PORT=3306
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_TIMEOUT_MS=10000
USE_MOCK_PROVIDERS=false
```

3. Create the database schema:

```bash
mysql -u devuser -p llm_site < sql/schema.sql
```

## Run

Ensure the Ollama service is running:

```bash
ollama serve
```

In another terminal, start the app:

```bash
npm run dev
```

Open <http://localhost:3011>

## Tests

```bash
npm run test:unit        # Jasmine unit tests
npm run test:acceptance  # Cucumber.js acceptance tests
npm run test:puppeteer   # Puppeteer browser automation
```

Acceptance tests are derived from user-facing use cases (see `features/`), and the suite can run fully offline using mock providers.

## Database Schema

- `conversation_threads` — chat thread metadata
- `conversation_messages` — persisted user/assistant messages with status, provider, and latency
- `request_history` — legacy prompt metadata
