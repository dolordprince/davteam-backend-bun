import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import JSZip from "jszip";
import { writeFileSync } from "fs";

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
    version: "2.0"
  }))

  .post("/api/ai", async ({ body }) => {
    const { input } = body as any;
    try {
      const output = await groq(input);
      return { output };
    } catch {
      return { output: "Groq unavailable" };
    }
  })

  .post("/api/generate", async ({ body }) => {
    const { prompt } = body as any;
    const system = `You are an expert web developer.
Generate a complete website based on the user prompt.
Respond ONLY with a JSON object (no markdown, no backticks):
{"projectName":"slug","files":{"index.html":"...","style.css":"...","app.js":"..."}}`;
    try {
      const raw = await groq(prompt, system);
      const clean = raw.replace(/\`\`\`json|\`\`\`/g, "").trim();
      return JSON.parse(clean);
    } catch {
      return {
        projectName: "fallback",
        files: {
          "index.html": `<h1>${prompt}</h1>`,
          "style.css": "body{background:#000;color:#00ffcc;}",
          "app.js": `console.log("${prompt}");`
        }
      };
    }
  })

  .post("/api/download", async ({ body }) => {
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
