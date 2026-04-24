# Yug Individual Iteration

This project demonstrates a local chat workspace with multi-turn conversations, two parallel conversation windows, and Ollama-backed assistant responses.

## Tech Stack

- Node.js + Express
- Vanilla HTML/CSS/JS frontend
- Jasmine (unit tests)
- Cucumber.js (acceptance tests)
- Puppeteer (browser automation)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create/edit `.env` in the project root with values like:

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

3. Create/update database schema:

```bash
mysql -u devuser -p llm_site < sql/schema.sql
```

## Run

Ensure Ollama service is running:

```bash
ollama serve
```

In another terminal, run the app:

```bash
npm run dev
```

Open: <http://localhost:3011>

## Tests

### Unit tests (Jasmine)

```bash
npm run test:unit
```

### Acceptance tests (Cucumber.js)

```bash
npm run test:acceptance
```

### Browser test (Puppeteer)

```bash
npm run test:puppeteer
```

## REST API Routing Table

- `GET /health` - health check.
- `POST /api/ask` - backward-compatible single prompt endpoint (legacy).
- `GET /api/history` - fetch recent prompt metadata from MySQL `request_history`.
- `GET /api/threads` - list conversation threads.
- `POST /api/threads` - create a new conversation thread.
- `GET /api/threads/:threadId/messages` - list messages in a thread.
- `POST /api/threads/:threadId/messages` - append user message and generate assistant reply.
- `POST /api/threads/:threadId/regenerate` - regenerate assistant reply for a user message.
- `POST /api/threads/:threadId/stop` - non-streaming placeholder stop endpoint.

## Database Design

Tables:
- `request_history` for legacy prompt metadata.
- `conversation_threads` for chat thread metadata.
- `conversation_messages` for persisted user/assistant messages with status, provider, and latency.

## Assignment Report Outline

Use this structure in your report document:

1. User Stories and Features
   - At least 3 user stories/features
   - Point estimates for each feature
   - Selected features for this iteration
2. UI Design
   - Number of pages
   - User interactions and page transitions
3. Unit Tests and Acceptance Tests
   - Derivation of acceptance tests from use cases (Cucumber.js)
   - Test suite design (Jasmine)
   - Mapping use cases to unit-test-driven implementation
4. Software Architecture and Implementation
   - REST API design
   - Routing table
   - Database design
5. Reproduction Instructions
   - Installation
   - Execution
   - Unit testing
   - Puppeteer testing
