const workspaceEl = document.getElementById("workspace");
const threadListEl = document.getElementById("thread-list");
const newThreadBtn = document.getElementById("new-thread-btn");
const threadStatusEl = document.getElementById("thread-status");
const workspaceStatusEl = document.getElementById("workspace-status");
const MAX_WINDOWS = 2;
const paneState = new Map();
let threads = [];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function basicMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function loadThreads() {
  threadStatusEl.textContent = "Loading conversations...";
  try {
    const data = await api("/api/threads");
    threads = data.threads || [];
    threadStatusEl.textContent = threads.length
      ? `${threads.length} conversations`
      : "No conversations yet.";
    renderThreadList();
    refreshPaneThreadOptions();
  } catch (error) {
    threadStatusEl.textContent = "Failed to load conversations.";
  }
}

function renderThreadList(activeThreadId = null) {
  threadListEl.innerHTML = "";
  if (!threads.length) return;
  threads.forEach((thread) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `thread-item ${thread.id === activeThreadId ? "active" : ""}`;
    button.dataset.threadId = String(thread.id);
    button.textContent = thread.title;
    threadListEl.appendChild(button);
  });
}

function refreshPaneThreadOptions() {
  paneState.forEach((state) => {
    const current = state.threadSelect.value;
    state.threadSelect.innerHTML = "";
    threads.forEach((thread) => {
      const option = document.createElement("option");
      option.value = String(thread.id);
      option.textContent = thread.title;
      state.threadSelect.appendChild(option);
    });
    if (threads.length) {
      state.threadSelect.value = current || String(threads[0].id);
    }
  });
}

function setPaneLoading(paneId, isLoading) {
  const state = paneState.get(paneId);
  if (!state) return;
  state.isLoading = isLoading;
  state.input.disabled = isLoading;
  state.sendBtn.disabled = isLoading;
  state.regenBtn.disabled = isLoading || !state.lastUserMessageId;
  state.sendBtn.textContent = isLoading ? "Sending..." : "Send";
}

function renderMessages(container, messages) {
  container.innerHTML = "";
  if (!messages.length) {
    container.innerHTML = '<p class="muted">No messages yet. Send one to start the conversation.</p>';
    return;
  }

  messages.forEach((msg) => {
    const messageNode = document.createElement("article");
    messageNode.className = `msg ${msg.role}`;
    const provider = msg.provider ? `<span>${msg.provider}</span>` : "";
    const latency = Number.isFinite(msg.latencyMs) ? `<span>${msg.latencyMs}ms</span>` : "";
    const status = msg.status ? `<span>${msg.status}</span>` : "";
    const showCopy = msg.role === "assistant"
      ? `<button type="button" class="copy-btn" data-copy="${encodeURIComponent(msg.content)}">Copy</button>`
      : "";

    messageNode.innerHTML = `
      <div>${basicMarkdown(msg.content)}</div>
      <div class="msg-meta">${provider}${latency}${status}</div>
      <div class="inline-actions">${showCopy}</div>
    `;
    container.appendChild(messageNode);
  });
  container.scrollTop = container.scrollHeight;
}

async function loadPaneMessages(paneId) {
  const state = paneState.get(paneId);
  if (!state) return;
  const threadId = Number(state.threadSelect.value);
  if (!threadId) return;
  state.statusEl.textContent = "Loading messages...";
  try {
    const data = await api(`/api/threads/${threadId}/messages`);
    state.messages = data.messages || [];
    const lastUser = [...state.messages].reverse().find((m) => m.role === "user");
    state.lastUserMessageId = lastUser ? lastUser.id : null;
    renderMessages(state.messagesEl, state.messages);
    state.statusEl.textContent = `${state.messages.length} messages`;
    renderThreadList(threadId);
  } catch (error) {
    state.statusEl.textContent = "Failed to load messages.";
  }
}

async function sendMessage(paneId) {
  const state = paneState.get(paneId);
  if (!state || state.isLoading) return;
  const content = state.input.value.trim();
  const threadId = Number(state.threadSelect.value);
  if (!content || !threadId) return;

  setPaneLoading(paneId, true);
  state.statusEl.textContent = "Generating response...";
  try {
    const data = await api(`/api/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    state.messages = data.messages || [];
    const lastUser = [...state.messages].reverse().find((m) => m.role === "user");
    state.lastUserMessageId = lastUser ? lastUser.id : null;
    renderMessages(state.messagesEl, state.messages);
    state.input.value = "";
    state.statusEl.textContent = `Provider: ${data.responseMeta.provider || "unknown"}, ${data.responseMeta.latencyMs}ms`;
    await loadThreads();
  } catch (error) {
    state.statusEl.textContent = error.message;
  } finally {
    setPaneLoading(paneId, false);
  }
}

async function regenerate(paneId) {
  const state = paneState.get(paneId);
  if (!state || !state.lastUserMessageId || state.isLoading) return;
  const threadId = Number(state.threadSelect.value);
  setPaneLoading(paneId, true);
  state.statusEl.textContent = "Regenerating...";
  try {
    const data = await api(`/api/threads/${threadId}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ userMessageId: state.lastUserMessageId }),
    });
    state.messages = data.messages || [];
    renderMessages(state.messagesEl, state.messages);
    state.statusEl.textContent = `Regenerated in ${data.responseMeta.latencyMs}ms`;
  } catch (error) {
    state.statusEl.textContent = error.message;
  } finally {
    setPaneLoading(paneId, false);
  }
}

async function stopGeneration(paneId) {
  const state = paneState.get(paneId);
  if (!state) return;
  const threadId = Number(state.threadSelect.value);
  if (!threadId) return;
  try {
    const data = await api(`/api/threads/${threadId}/stop`, { method: "POST" });
    state.statusEl.textContent = data.message;
  } catch (error) {
    state.statusEl.textContent = error.message;
  }
}

function createPane(paneIndex) {
  const paneId = `pane-${paneIndex}`;
  const pane = document.createElement("section");
  pane.className = "chat-pane";
  pane.innerHTML = `
    <header class="pane-header">
      <strong>Window ${paneIndex}</strong>
      <select class="thread-select"></select>
      <span class="muted pane-status">Idle</span>
    </header>
    <section class="messages"></section>
    <section class="composer">
      <input class="composer-input" placeholder="Type your message..." />
      <div class="composer-row">
        <button class="ask-btn send-btn" type="button">Send</button>
        <button class="regen-btn" type="button">Regenerate</button>
        <button class="stop-btn" type="button">Stop</button>
      </div>
    </section>
  `;
  workspaceEl.appendChild(pane);

  const state = {
    isLoading: false,
    threadSelect: pane.querySelector(".thread-select"),
    statusEl: pane.querySelector(".pane-status"),
    messagesEl: pane.querySelector(".messages"),
    input: pane.querySelector(".composer-input"),
    sendBtn: pane.querySelector(".send-btn"),
    regenBtn: pane.querySelector(".regen-btn"),
    stopBtn: pane.querySelector(".stop-btn"),
    lastUserMessageId: null,
    messages: [],
  };
  paneState.set(paneId, state);

  state.sendBtn.addEventListener("click", () => sendMessage(paneId));
  state.regenBtn.addEventListener("click", () => regenerate(paneId));
  state.stopBtn.addEventListener("click", () => stopGeneration(paneId));
  state.threadSelect.addEventListener("change", () => loadPaneMessages(paneId));
  state.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage(paneId);
    }
  });
  state.messagesEl.addEventListener("click", async (event) => {
    const copyBtn = event.target.closest(".copy-btn");
    if (!copyBtn) return;
    const decoded = decodeURIComponent(copyBtn.dataset.copy || "");
    await navigator.clipboard.writeText(decoded);
    state.statusEl.textContent = "Copied assistant response.";
  });
}

async function createThread() {
  try {
    const data = await api("/api/threads", {
      method: "POST",
      body: JSON.stringify({ title: `Conversation ${threads.length + 1}` }),
    });
    threads = [data.thread, ...threads];
    renderThreadList(data.thread.id);
    refreshPaneThreadOptions();
    paneState.forEach((state, paneId) => {
      if (!state.threadSelect.value) {
        state.threadSelect.value = String(data.thread.id);
        loadPaneMessages(paneId);
      }
    });
  } catch (error) {
    threadStatusEl.textContent = "Failed to create conversation.";
  }
}

threadListEl.addEventListener("click", (event) => {
  const target = event.target.closest(".thread-item");
  if (!target) return;
  const threadId = target.dataset.threadId;
  const firstPane = paneState.get("pane-1");
  if (!firstPane) return;
  firstPane.threadSelect.value = threadId;
  loadPaneMessages("pane-1");
});

newThreadBtn.addEventListener("click", createThread);

async function init() {
  workspaceStatusEl.textContent = `${MAX_WINDOWS} conversation windows available`;
  for (let i = 1; i <= MAX_WINDOWS; i += 1) createPane(i);
  await loadThreads();
  if (!threads.length) {
    await createThread();
  }
  paneState.forEach((_, paneId) => loadPaneMessages(paneId));
}

init();
