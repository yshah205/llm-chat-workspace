const { getPool } = require("./connection");

async function createRequestHistoryEntry({
  prompt,
  modelCount,
  successCount,
  status,
  latencyMs,
}) {
  const pool = getPool();
  const [result] = await pool.execute(
    `INSERT INTO request_history
      (prompt, model_count, success_count, status, latency_ms)
     VALUES (?, ?, ?, ?, ?)`,
    [prompt, modelCount, successCount, status, latencyMs]
  );

  return result.insertId;
}

async function listRecentRequestHistory(limit = 10) {
  const pool = getPool();
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 50)) : 10;
  const [rows] = await pool.execute(
    `SELECT id, prompt, model_count AS modelCount, success_count AS successCount, status, latency_ms AS latencyMs, created_at AS createdAt
     FROM request_history
     ORDER BY id DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

module.exports = {
  createRequestHistoryEntry,
  listRecentRequestHistory,
};
