/**
 * Diagnoses the Gemini connection.
 *
 * Run with: npm run check:ai
 *
 * The dashboard is built to fall back silently, which is right for a reader
 * during a storm and useless when you are trying to work out why the fallback
 * is happening. This says exactly what went wrong, and never prints the key.
 */

import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  // The dev server reads .env.local for us; a bare script does not.
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const at = trimmed.indexOf("=");
      if (at < 0) continue;
      const key = trimmed.slice(0, at).trim();
      if (!process.env[key]) process.env[key] = trimmed.slice(at + 1).trim();
    }
  }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY;

console.log("\nGemini connection check\n");

if (!apiKey) {
  console.log("FAIL  No GEMINI_API_KEY found in .env.local or .env.");
  console.log("      Add it to .env.local, then run this again.\n");
  process.exit(1);
}

console.log(`key    ${apiKey.length} characters, starts with "${apiKey.slice(0, 4)}"`);

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

async function listModels() {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: { "x-goog-api-key": apiKey! },
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.text();
  if (!response.ok) {
    console.log(`\nFAIL  Listing models returned ${response.status}.`);
    console.log(`      ${body.slice(0, 500)}\n`);
    if (response.status === 400) {
      console.log("      A 400 here usually means the key is not a Generative Language");
      console.log("      API key. Keys from aistudio.google.com/apikey start with AIza.");
    }
    if (response.status === 403) {
      console.log("      A 403 usually means the Generative Language API is not enabled");
      console.log("      on the project the key belongs to.");
    }
    return null;
  }
  const parsed = JSON.parse(body) as { models?: Array<{ name: string }> };
  const names = (parsed.models ?? []).map((m) => m.name.replace("models/", ""));
  console.log(`\nok     Key is valid. ${names.length} models visible.`);
  const flash = names.filter((n) => n.includes("flash")).slice(0, 6);
  if (flash.length) console.log(`       flash models: ${flash.join(", ")}`);
  console.log(`       ${MODEL} available: ${names.includes(MODEL)}`);
  return names;
}

async function generate() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey! },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Reply with JSON: {"items":[{"title":"ok"}]}' }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,
        maxOutputTokens: 2048,
        // Gemini 3 uses thinkingLevel. The 2.x thinkingBudget field is a 400.
        thinkingConfig: { thinkingLevel: "low" },
      },
    }),
    signal: AbortSignal.timeout(20000),
  });

  const body = await response.text();
  if (!response.ok) {
    console.log(`\nFAIL  generateContent returned ${response.status}.`);
    console.log(`      ${body.slice(0, 600)}\n`);
    return false;
  }

  const parsed = JSON.parse(body) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    usageMetadata?: Record<string, number>;
  };
  const candidate = parsed.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  console.log(`\nok     generateContent responded.`);
  console.log(`       finishReason: ${candidate?.finishReason ?? "none"}`);
  console.log(`       tokens: ${JSON.stringify(parsed.usageMetadata ?? {})}`);

  if (!text) {
    console.log("\nFAIL  The response carried no text.");
    console.log("      If finishReason is MAX_TOKENS, thinking consumed the budget.\n");
    return false;
  }
  console.log(`       text: ${text.slice(0, 120)}`);
  console.log("\nAll good. The dashboard should now say 'Written for these conditions'.\n");
  return true;
}

const models = await listModels();
if (!models) process.exit(1);
const ok = await generate();
process.exit(ok ? 0 : 1);
