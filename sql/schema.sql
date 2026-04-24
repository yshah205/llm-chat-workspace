CREATE TABLE IF NOT EXISTS request_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  prompt TEXT NOT NULL,
  model_count INT NOT NULL,
  success_count INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  latency_ms INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_threads (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  thread_id BIGINT NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content MEDIUMTEXT NOT NULL,
  provider VARCHAR(128) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ok',
  latency_ms INT NULL,
  reply_to_message_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_thread FOREIGN KEY (thread_id) REFERENCES conversation_threads(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_reply FOREIGN KEY (reply_to_message_id) REFERENCES conversation_messages(id) ON DELETE SET NULL
);
