import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { POST } from "./route";

const { createCompletion, configureClient, consumeRateLimit } = vi.hoisted(() => ({
  createCompletion: vi.fn(),
  configureClient: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock("openai", () => {
  class MockAPIError extends Error {
    constructor(
      readonly status: number | undefined,
      readonly error: object | undefined,
      message: string | undefined,
      readonly headers: Headers | undefined,
    ) {
      super(message);
    }
  }

  return {
    default: class MockOpenAI {
      static APIError = MockAPIError;
      chat = { completions: { create: createCompletion } };

      constructor(options: unknown) {
        configureClient(options);
      }
    },
  };
});

vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit }));

function chatRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Perplexity Router chat API", () => {
  beforeEach(() => {
    vi.stubEnv("PERPLEXITY_API_KEY", "test-perplexity-key");
    vi.stubEnv("PERPLEXITY_ROUTER_MODEL", "configured-by-test");
    createCompletion.mockReset();
    configureClient.mockReset();
    consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects oversized requests before contacting the provider", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Length": "12001" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(413);
    expect(createCompletion).not.toHaveBeenCalled();

    const streamedResponse = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ padding: "x".repeat(12_000) }),
      }),
    );
    expect(streamedResponse.status).toBe(413);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it.each(["PERPLEXITY_API_KEY", "PERPLEXITY_ROUTER_MODEL"])(
    "returns unavailable when %s is not configured",
    async (variable) => {
      vi.stubEnv(variable, "");
      const response = await POST(chatRequest({
        locale: "en",
        messages: [{ role: "user", content: "Hello" }],
      }));

      expect(response.status).toBe(503);
      expect(createCompletion).not.toHaveBeenCalled();
    },
  );

  it("calls the OpenAI SDK against Router using the configured model", async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: "Bonjour !" } }],
    });
    const response = await POST(chatRequest({
      locale: "fr",
      messages: [{ role: "user", content: "Bonjour" }],
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ answer: "Bonjour !" });
    expect(configureClient).toHaveBeenCalledWith({
      apiKey: "test-perplexity-key",
      baseURL: "https://api.perplexity.ai/router/v1",
      timeout: 20_000,
    });
    expect(createCompletion).toHaveBeenCalledWith({
      model: "configured-by-test",
      max_tokens: 400,
      temperature: 0.2,
      messages: [
        expect.objectContaining({ content: expect.stringContaining("French") }),
        { role: "user", content: "Bonjour" },
      ],
    });
  });

  it("rejects invalid input without contacting the provider", async () => {
    const response = await POST(chatRequest({
      locale: "it",
      messages: [{ role: "user", content: "Ciao" }],
    }));

    expect(response.status).toBe(400);
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when the client exceeds the chat limit", async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });

    const response = await POST(chatRequest({
      locale: "en",
      messages: [{ role: "user", content: "Hello" }],
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it.each([400, 401, 402])(
    "preserves Router API client error status %i",
    async (status) => {
      createCompletion.mockRejectedValue(
        new OpenAI.APIError(status, undefined, "provider rejected request", new Headers()),
      );
      const response = await POST(chatRequest({
        locale: "en",
        messages: [{ role: "user", content: "Hello" }],
      }));

      expect(response.status).toBe(status);
    },
  );

  it("preserves overload status and Retry-After from the Router API", async () => {
    createCompletion.mockRejectedValue(
      new OpenAI.APIError(429, undefined, "model overloaded", new Headers({ "retry-after": "3" })),
    );
    const response = await POST(chatRequest({
      locale: "en",
      messages: [{ role: "user", content: "Hello" }],
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3");
  });

  it("returns a gateway error when the provider response has no assistant text", async () => {
    createCompletion.mockResolvedValue({ choices: [] });
    const response = await POST(chatRequest({
      locale: "en",
      messages: [{ role: "user", content: "Hello" }],
    }));

    expect(response.status).toBe(502);
  });
});
