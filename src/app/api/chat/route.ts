import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { locales } from "@/lib/i18n";

export const runtime = "nodejs";

const routerBaseUrl = "https://api.perplexity.ai/router/v1";

const requestSchema = z.object({
  locale: z.enum(locales),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1200),
      }),
    )
    .min(1)
    .max(8)
    .refine((messages) => messages.at(-1)?.role === "user", {
      message: "The last chat message must be from the user.",
    }),
});

const languageNames = {
  es: "Spanish",
  en: "English",
  fr: "French",
  de: "German",
} as const;

const maxRequestBytes = 12_000;

async function readRequestBody(request: Request): Promise<
  | { ok: true; body: unknown }
  | { ok: false; status: 400 | 413; error: string }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      return { ok: false, status: 400, error: "Invalid content length." };
    }
    if (Number(contentLength) > maxRequestBytes) {
      return { ok: false, status: 413, error: "Chat request is too large." };
    }
  }

  if (!request.body) {
    return { ok: false, status: 400, error: "Invalid JSON request." };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxRequestBytes) {
        return { ok: false, status: 413, error: "Chat request is too large." };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON request." };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON request." };
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  const model = process.env.PERPLEXITY_ROUTER_MODEL?.trim();
  if (!apiKey || !model) {
    return NextResponse.json(
      { error: "Chat is not configured. Set the server API key and an allowed Router model." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await readRequestBody(request);
  if (!body.ok) {
    return NextResponse.json(
      { error: body.error },
      { status: body.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = requestSchema.safeParse(body.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid chat message." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: routerBaseUrl,
      timeout: 20_000,
    });
    const response = await client.chat.completions.create({
      model,
      max_tokens: 400,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are Pezcado's concise customer support assistant. Reply only in ${languageNames[parsed.data.locale]}. Help with store navigation, account access, carts, and order support. Never claim to see or modify a customer's account or order. Direct account-specific issues to the account page or store support. Do not request or accept passwords, card details, or other payment secrets. Keep replies friendly, brief, and clear.`,
        },
        ...parsed.data.messages,
      ],
    });

    const answer = response.choices[0]?.message.content;
    if (typeof answer !== "string" || !answer.trim()) {
      console.error("Perplexity Router response did not contain an assistant message.");
      return NextResponse.json(
        { error: "Chat provider returned an invalid response." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { answer },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error("Perplexity Router request failed with status:", error.status);
      const retryAfter = error.headers?.get("retry-after");
      const providerStatus = error.status;
      const status =
        providerStatus === 400 || providerStatus === 401 || providerStatus === 402 || providerStatus === 429
          ? providerStatus
          : 502;
      const headers = new Headers({ "Cache-Control": "no-store" });
      if (status === 429 && retryAfter) headers.set("Retry-After", retryAfter);
      return NextResponse.json(
        {
          error:
            status === 429
              ? "Chat provider is temporarily overloaded. Please retry later."
              : "Chat provider is temporarily unavailable.",
        },
        { status, headers },
      );
    }

    console.error(
      "Unable to reach Perplexity Router:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return NextResponse.json(
      { error: "Chat provider is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
