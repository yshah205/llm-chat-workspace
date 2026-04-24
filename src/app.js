const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const { queryAllProviders } = require("./providers");
const {
  createRequestHistoryEntry,
  listRecentRequestHistory,
} = require("./db/requestRepository");
const {
  createThread,
  listThreads,
  getThreadById,
  createMessage,
  listMessagesByThread,
} = require("./db/conversationRepository");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/ask", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    const start = Date.now();
    const responses = await queryAllProviders(prompt.trim());
    const successCount = responses.filter((item) => item.status === "ok").length;
    const modelCount = responses.length;
    const latencyMs = Date.now() - start;
    const status =
      successCount === modelCount
        ? "success"
        : successCount > 0
          ? "partial_success"
          : "failed";

    let requestId = null;
    try {
      requestId = await createRequestHistoryEntry({
        prompt: prompt.trim(),
        modelCount,
        successCount,
        status,
        latencyMs,
      });
    } catch (dbError) {
      requestId = null;
    }

    return res.json({
      prompt: prompt.trim(),
      responses,
      requestMeta: {
        requestId,
        modelCount,
        successCount,
        status,
        latencyMs,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to query providers." });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const history = await listRecentRequestHistory();
    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load history." });
  }
});

app.get("/api/threads", async (req, res) => {
  try {
    const threads = await listThreads();
    return res.json({ threads });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load threads." });
  }
});

app.post("/api/threads", async (req, res) => {
  const titleRaw = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const title = titleRaw || "New Conversation";

  try {
    const threadId = await createThread(title);
    const thread = await getThreadById(threadId);
    return res.status(201).json({ thread });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create thread." });
  }
});

app.get("/api/threads/:threadId/messages", async (req, res) => {
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return res.status(400).json({ error: "Invalid thread id." });
  }

  try {
    const thread = await getThreadById(threadId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found." });
    }

    const messages = await listMessagesByThread(threadId);
    return res.json({ thread, messages });
  } catch (error) {
    return res.status(500).json({ error: "Failed to load messages." });
  }
});

app.post("/api/threads/:threadId/messages", async (req, res) => {
  const threadId = Number(req.params.threadId);
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

  if (!Number.isInteger(threadId) || threadId <= 0) {
    return res.status(400).json({ error: "Invalid thread id." });
  }
  if (!content) {
    return res.status(400).json({ error: "Message content is required." });
  }

  try {
    const thread = await getThreadById(threadId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found." });
    }

    const userMessageId = await createMessage({
      threadId,
      role: "user",
      content,
    });

    const contextMessages = await listMessagesByThread(threadId);
    const contextPrompt = contextMessages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");

    const start = Date.now();
    const responses = await queryAllProviders(contextPrompt);
    const firstResponse = responses[0] || {
      provider: "unknown",
      status: "error",
      answer: "",
      error: "No provider response",
    };
    const latencyMs = Date.now() - start;

    const assistantMessageId = await createMessage({
      threadId,
      role: "assistant",
      content: firstResponse.answer || firstResponse.error || "No response",
      provider: firstResponse.provider || null,
      status: firstResponse.status || "error",
      latencyMs,
      replyToMessageId: userMessageId,
    });

    const messages = await listMessagesByThread(threadId);
    return res.status(201).json({
      threadId,
      userMessageId,
      assistantMessageId,
      messages,
      responseMeta: {
        provider: firstResponse.provider || null,
        status: firstResponse.status || "error",
        latencyMs,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to send message." });
  }
});

app.post("/api/threads/:threadId/regenerate", async (req, res) => {
  const threadId = Number(req.params.threadId);
  const userMessageId = Number(req.body?.userMessageId);

  if (!Number.isInteger(threadId) || threadId <= 0 || !Number.isInteger(userMessageId)) {
    return res.status(400).json({ error: "Invalid regenerate request." });
  }

  try {
    const thread = await getThreadById(threadId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found." });
    }

    const messages = await listMessagesByThread(threadId);
    const targetUserMessage = messages.find(
      (msg) => msg.id === userMessageId && msg.role === "user"
    );
    if (!targetUserMessage) {
      return res.status(404).json({ error: "User message not found." });
    }

    const contextPrompt = messages
      .filter((msg) => msg.id <= userMessageId)
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n");

    const start = Date.now();
    const responses = await queryAllProviders(contextPrompt);
    const firstResponse = responses[0] || {
      provider: "unknown",
      status: "error",
      answer: "",
      error: "No provider response",
    };
    const latencyMs = Date.now() - start;

    const assistantMessageId = await createMessage({
      threadId,
      role: "assistant",
      content: firstResponse.answer || firstResponse.error || "No response",
      provider: firstResponse.provider || null,
      status: firstResponse.status || "error",
      latencyMs,
      replyToMessageId: userMessageId,
    });

    const updatedMessages = await listMessagesByThread(threadId);
    return res.status(201).json({
      assistantMessageId,
      messages: updatedMessages,
      responseMeta: {
        provider: firstResponse.provider || null,
        status: firstResponse.status || "error",
        latencyMs,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to regenerate response." });
  }
});

app.post("/api/threads/:threadId/stop", async (req, res) => {
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return res.status(400).json({ error: "Invalid thread id." });
  }
  return res.json({ status: "accepted", message: "Stop is a non-streaming placeholder in v1." });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
