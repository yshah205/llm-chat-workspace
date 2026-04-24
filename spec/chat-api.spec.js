const app = require("../src/app");

describe("chat conversation APIs", () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    process.env.USE_MOCK_PROVIDERS = "true";
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (!server) return done();
    server.close(done);
  });

  it("creates a thread and sends a message", async () => {
    const createThreadResponse = await fetch(`${baseUrl}/api/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Spec Thread" }),
    });
    const threadData = await createThreadResponse.json();
    expect(createThreadResponse.status).toBe(201);
    expect(threadData.thread.id).toBeDefined();

    const sendMessageResponse = await fetch(
      `${baseUrl}/api/threads/${threadData.thread.id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Hello from jasmine" }),
      }
    );
    const messageData = await sendMessageResponse.json();
    expect(sendMessageResponse.status).toBe(201);
    expect(Array.isArray(messageData.messages)).toBeTrue();
    expect(messageData.messages.length).toBeGreaterThanOrEqual(2);
    const roles = messageData.messages.map((m) => m.role);
    expect(roles).toContain("user");
    expect(roles).toContain("assistant");
  });
});
