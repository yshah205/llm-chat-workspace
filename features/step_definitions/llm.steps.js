const { Given, When, Then, After } = require("@cucumber/cucumber");
const assert = require("assert");
const app = require("../../src/app");

Given("the chat API server is running", function () {
  if (this.server) return;
  process.env.USE_MOCK_PROVIDERS = "true";
  this.server = app.listen(0);
  const { port } = this.server.address();
  this.baseUrl = `http://127.0.0.1:${port}`;
});

When("I create a new conversation thread", async function () {
  const response = await fetch(`${this.baseUrl}/api/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Cucumber Thread" }),
  });
  const data = await response.json();
  this.thread = data.thread;
  assert.strictEqual(response.status, 201);
});

When("I send a message {string}", async function (content) {
  const response = await fetch(`${this.baseUrl}/api/threads/${this.thread.id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const data = await response.json();
  this.messages = data.messages;
  this.lastUserMessageId = data.userMessageId;
  assert.strictEqual(response.status, 201);
});

Then("I should receive user and assistant messages", async function () {
  assert.ok(Array.isArray(this.messages));
  const roles = this.messages.map((m) => m.role);
  assert.ok(roles.includes("user"));
  assert.ok(roles.includes("assistant"));
});

When("I regenerate the assistant response", async function () {
  const response = await fetch(`${this.baseUrl}/api/threads/${this.thread.id}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userMessageId: this.lastUserMessageId }),
  });
  const data = await response.json();
  this.messages = data.messages;
  assert.strictEqual(response.status, 201);
});

Then("the conversation should include at least two assistant messages", async function () {
  const assistantCount = this.messages.filter((m) => m.role === "assistant").length;
  assert.ok(assistantCount >= 2);
});

After(async function () {
  if (this.server) {
    await new Promise((resolve) => this.server.close(resolve));
    this.server = null;
  }
});
