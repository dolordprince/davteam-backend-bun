import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import JSZip from "jszip";
import { writeFileSync } from "fs";

const app = new Elysia()
  .use(cors())

  .get("/", () => ({
    status: "HERMES AI ONLINE",
    runtime: "bun",
    services: ["ai", "generator", "zip-download"]
  }))

  .post("/api/ai", async ({ body }) => {
    const { input } = body as any;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: input }],
          max_tokens: 1024
        })
      });

      const data = await res.json();
      // Return full response for debugging
      return { output: data.choices?.[0]?.message?.content || "No response" };
    } catch (err: any) {
      return { output: "Groq unavailable", error: err.message };
    }
  })

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
