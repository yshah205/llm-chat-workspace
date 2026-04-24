const { queryAllProviders, DEFAULT_MODELS } = require("../src/providers");

describe("queryAllProviders", () => {
  it("returns responses from configured providers in mock mode", async () => {
    const prompt = "What is test-driven development?";
    const responses = await queryAllProviders(prompt, { useMock: true });

    expect(Array.isArray(responses)).toBeTrue();
    expect(responses.length).toBe(DEFAULT_MODELS.length);
    expect(responses.map((r) => r.provider)).toEqual(DEFAULT_MODELS);
    expect(responses.every((r) => r.status === "ok")).toBeTrue();
    expect(responses[0].answer).toContain(prompt);
  });

  it("returns error status when the configured provider fails in mock mode", async () => {
    const prompt = "Define REST API";
    const responses = await queryAllProviders(prompt, {
      useMock: true,
      failModels: ["llama3.2:latest"],
    });

    expect(responses.length).toBe(1);
    const failed = responses.find((r) => r.provider === "llama3.2:latest");

    expect(failed.status).toBe("error");
  });
});
