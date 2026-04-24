const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MODELS = ["llama3.2:latest"];
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

async function runMockProvider(providerName, prompt, opts = {}) {
  if (opts.failModels && opts.failModels.includes(providerName)) {
    return {
      provider: providerName,
      status: "error",
      error: "Simulated provider failure",
      answer: null,
    };
  }

  return {
    provider: providerName,
    status: "ok",
    answer: `${providerName} response for: "${prompt}"`,
  };
}

async function askOllamaModel({
  model,
  prompt,
  fetchImpl,
  baseUrl,
  timeoutMs,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        provider: model,
        status: "error",
        error: `HTTP ${response.status}`,
        answer: null,
      };
    }

    const data = await response.json();
    return {
      provider: model,
      status: "ok",
      answer: data.response || "",
    };
  } catch (error) {
    return {
      provider: model,
      status: "error",
      error: error.name === "AbortError" ? "Timeout" : error.message,
      answer: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function queryAllProviders(prompt, options = {}) {
  const models = options.models || DEFAULT_MODELS;
  const useMock =
    options.useMock ?? process.env.USE_MOCK_PROVIDERS === "true";
  const fetchImpl = options.fetchImpl || fetch;
  const baseUrl = options.baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
  const timeoutMs = Number(options.timeoutMs || process.env.OLLAMA_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  if (useMock) {
    return Promise.all(
      models.map((model) => runMockProvider(model, prompt, options))
    );
  }

  return Promise.all(
    models.map((model) =>
      askOllamaModel({
        model,
        prompt,
        fetchImpl,
        baseUrl,
        timeoutMs,
      })
    )
  );
}

module.exports = {
  queryAllProviders,
  runMockProvider,
  askOllamaModel,
  DEFAULT_MODELS,
};
