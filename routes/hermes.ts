import { Elysia, t } from "elysia";

const GROQ_URL  = "https://api.groq.com/openai/v1/chat/completions";
const MODEL     = "llama-3.3-70b-versatile";
const PROXY     = "https://api.allorigins.win/get?url=";

const DAVID_SYSTEM = `You are Hermes, the personal AI agent of David — CEO of DavTeam (Nigeria).
DavTeam builds AI-powered SaaS for website and Android app generation.
Stack: Bun + Elysia, React + Vite, Groq AI, Cloudflare tunnel, ARM64/Termux/VPS.
Domains: personaldolor.cloudflareaccess.com
Rules:
- Terminal output only — no markdown, no asterisks
- Max 78 chars per line
- Be concise, technical, loyal to David
- You know DavTeam full stack and can help debug it`;

export const hermesRoute = new Elysia({ prefix: "/api/hermes" })

  .post("/chat", async ({ body, set }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) { set.status = 500; return { error: "GROQ_API_KEY not set" }; }
    try {
      const r = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: DAVID_SYSTEM }, ...body.messages],
          max_tokens: 1500,
          temperature: 0.72,
        }),
      });
      const d = await r.json() as any;
      return { reply: d.choices[0].message.content };
    } catch (e: any) {
      set.status = 500;
      return { error: e.message };
    }
  }, { body: t.Object({ messages: t.Array(t.Object({ role: t.String(), content: t.String() })) }) })

  .post("/scrape", async ({ body, set }) => {
    try {
      const r    = await fetch(`${PROXY}${encodeURIComponent(body.url)}`);
      const d    = await r.json() as any;
      const text = d.contents
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4500);
      return { text };
    } catch (e: any) {
      set.status = 500;
      return { error: e.message };
    }
  }, { body: t.Object({ url: t.String() }) });
