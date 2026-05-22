import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import JSZip from "jszip";
import { writeFileSync } from "fs";

const app = new Elysia()
  .use(cors())

  // Health probe — Cloud Shell uptime check
  .get("/", () => ({
    status: "HERMES AI ONLINE",
    runtime: "bun",
    services: ["ai", "generator", "zip-download"]
  }))

  // Ollama relay — expects local llama3 on :11434
  .post("/api/ai", async ({ body }) => {
    const { input } = body as any;

    try {
      const res = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3",
          prompt: input,
          stream: false   // streaming disabled; avoids chunked-read complexity on mobile clients
        })
      });

      const data = await res.json();

      return { output: data?.response || "AI offline" };
    } catch {
      return { output: "AI engine unavailable" };
    }
  })

  // Static scaffold generator — swap for Groq call when Ollama absent
  .post("/api/generate", async ({ body }) => {
    const { prompt } = body as any;

    return {
      projectName: "hermes-generated-app",
      prompt,
      files: {
        "index.html": `<h1>${prompt}</h1>`,
        "style.css": "body{background:#000;color:#00ffcc;font-family:sans-serif;}",
        "app.js": `console.log("Generated:", ${JSON.stringify(prompt)});`
      }
    };
  })

  // ZIP packager — writes to CWD; serve via Cloudflare tunnel
  .post("/api/download", async ({ body }) => {
    const { files } = body as any;

    const zip = new JSZip();

    for (const [name, content] of Object.entries(files)) {
      zip.file(name, content as string);
    }

    // nodebuffer required; Bun's Response.blob() path adds latency on ARM
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const path = "./generated.zip";
    writeFileSync(path, buffer);

    return { download: path };
  })

  .listen(8080);

console.log("[HERMES READY] :8080");
