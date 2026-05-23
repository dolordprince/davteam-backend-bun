import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import JSZip from "jszip";
import { writeFileSync } from "fs";

const API_KEY = process.env.davteam_API_KEY || "hermes-dev-key";

// Auth middleware — checks x-api-key header
const authGuard = ({ headers, set }: any) => {
  if (headers["x-api-key"] !== API_KEY) {
    set.status = 401;
    return { error: "Unauthorized" };
  }
};

const groq = async (prompt: string, system?: string) => {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt }
      ],
      max_tokens: 4096
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
};

const app = new Elysia()
  .use(cors())

  .get("/", () => ({
    status: "HERMES AI ONLINE",
    runtime: "bun",
    version: "2.0",
    services: ["ai", "generator", "zip-download"],
    auth: "x-api-key header required on protected routes"
  }))

  // Public AI chat
  .post("/api/ai", async ({ body }) => {
    const { input } = body as any;
    try {
      const output = await groq(input);
      return { output };
    } catch {
      return { output: "Groq unavailable" };
    }
  })

  // Protected — Groq generates real HTML/CSS/JS
  .post("/api/generate", async ({ body, headers, set }) => {
    const guard = authGuard({ headers, set });
    if (guard) return guard;

    const { prompt } = body as any;

    const system = `You are an expert web developer. 
Generate a complete, beautiful, modern website based on the user prompt.
Respond ONLY with a JSON object (no markdown, no backticks) in this exact format:
{
  "projectName": "slug-name",
  "files": {
    "index.html": "full html here",
    "style.css": "full css here",
    "app.js": "full js here"
  }
}`;

    try {
      const raw = await groq(prompt, system);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return parsed;
    } catch {
      return {
        projectName: "hermes-fallback",
        prompt,
        files: {
          "index.html": `<h1>${prompt}</h1>`,
          "style.css": "body{background:#000;color:#00ffcc;}",
          "app.js": `console.log(${JSON.stringify(prompt)});`
        }
      };
    }
  })

  // Protected — ZIP packager
  .post("/api/download", async ({ body, headers, set }) => {
    const guard = authGuard({ headers, set });
    if (guard) return guard;

    const { files } = body as any;
    const zip = new JSZip();
    for (const [name, content] of Object.entries(files)) {
      zip.file(name, content as string);
    }
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    writeFileSync("./generated.zip", buffer);
    return { download: "./generated.zip" };
  })

  .listen(Number(process.env.PORT) || 10000);

console.log("[HERMES READY] :10000");
