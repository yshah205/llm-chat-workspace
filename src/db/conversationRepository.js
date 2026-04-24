const { getPool } = require("./connection");

async function createThread(title) {
  const pool = getPool();
  const [result] = await pool.execute(
    "INSERT INTO conversation_threads (title) VALUES (?)",
    [title]
  );
  return result.insertId;
}

async function listThreads(limit = 50) {
  const pool = getPool();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 50;
  const [rows] = await pool.execute(
    `SELECT id, title, created_at AS createdAt, updated_at AS updatedAt
     FROM conversation_threads
     ORDER BY updated_at DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

async function getThreadById(threadId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, title, created_at AS createdAt, updated_at AS updatedAt
     FROM conversation_threads
     WHERE id = ?`,
    [threadId]
  );
  return rows[0] || null;
}

async function touchThread(threadId) {
  const pool = getPool();
  await pool.execute(
    "UPDATE conversation_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [threadId]
  );
}

async function createMessage({
  threadId,
  role,
  content,
  provider = null,
  status = "ok",
  latencyMs = null,
  replyToMessageId = null,
}) {
  const pool = getPool();
  const [result] = await pool.execute(
    `INSERT INTO conversation_messages
      (thread_id, role, content, provider, status, latency_ms, reply_to_message_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [threadId, role, content, provider, status, latencyMs, replyToMessageId]
  );
  await touchThread(threadId);
  return result.insertId;
}

async function listMessagesByThread(threadId, limit = 200) {
  const pool = getPool();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 300)) : 200;
  const [rows] = await pool.execute(
    `SELECT
      id,
      thread_id AS threadId,
      role,
      content,
      provider,
      status,
      latency_ms AS latencyMs,
      reply_to_message_id AS replyToMessageId,
      created_at AS createdAt
     FROM conversation_messages
     WHERE thread_id = ?
     ORDER BY id ASC
     LIMIT ${safeLimit}`,
    [threadId]
  );
  return rows;
}

module.exports = {
  createThread,
  listThreads,
  getThreadById,
  createMessage,
  listMessagesByThread,
};
