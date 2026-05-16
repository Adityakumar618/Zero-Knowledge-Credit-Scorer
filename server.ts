import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";
import Groq from "groq-sdk";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

const execAsync = promisify(exec);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

  app.use(express.json());

  const upload = multer({ storage: multer.memoryStorage() });

  app.post("/api/upload-bill", upload.single("bill"), async (req, res) => {
    const tmpId = crypto.randomUUID();
    const tmpPdf = path.join(os.tmpdir(), `${tmpId}.pdf`);
    const tmpPrefix = path.join(os.tmpdir(), tmpId);

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      if (!groq) {
        return res.status(503).json({ error: "GROQ_API_KEY not configured — add it to .env" });
      }

      // Write PDF to temp file and convert pages to PNG with pdftoppm
      fs.writeFileSync(tmpPdf, req.file.buffer);
      console.log(`Converting PDF (${req.file.size} bytes) to images...`);
      await execAsync(`pdftoppm -r 150 -png -l 4 "${tmpPdf}" "${tmpPrefix}"`);

      // Collect generated PNG files (sorted page order)
      const pngFiles = fs.readdirSync(os.tmpdir())
        .filter(f => f.startsWith(tmpId) && f.endsWith(".png"))
        .sort()
        .map(f => path.join(os.tmpdir(), f));

      if (pngFiles.length === 0) {
        return res.status(422).json({ error: "Could not render PDF pages" });
      }

      console.log(`Sending ${pngFiles.length} page(s) to GROQ vision...`);

      // Build image content blocks (one per page)
      const imageBlocks = pngFiles.map(f => ({
        type: "image_url" as const,
        image_url: {
          url: `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`,
        },
      }));

      const completion = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "You are a bank statement parser. Extract all financial data and return ONLY raw JSON. No markdown, no explanation.",
          },
          {
            role: "user",
            content: [
              ...imageBlocks,
              {
                type: "text",
                text: `Extract all financial data from this bank statement and return exactly this JSON structure (compute all values from what you see — no placeholders):
{
  "user_id": "<account number from statement>",
  "bank": "<bank name>",
  "currency": "<currency code, e.g. USD>",
  "account_holder": "<full name on statement>",
  "period": "<statement period, e.g. Oct 2024 - Nov 2024>",
  "beginning_balance": <number>,
  "ending_balance": <number>,
  "average_balance": <number>,
  "months": [
    { "month": "<Mon YYYY>", "income": <total credits that month>, "expenses": <total debits that month>, "debt_payment": <debt/loan payments, 0 if none> }
  ],
  "total_credits": <number>,
  "total_debits": <number>,
  "service_charges": <number>,
  "bills": [
    { "id": "1", "provider": "<payee or merchant name>", "status": "paid|unpaid", "amount": <number>, "month": "<Mon YYYY>" }
  ],
  "monthlyIncome": <total credits as a number>,
  "monthlyExpenses": <total debits as a number>,
  "totalDebt": <outstanding debt or 0>,
  "latePayments": <count of overdue or late payments>,
  "creditScore": <integer 300-850 based on payment behaviour and balance health>,
  "riskLevel": "<LOW if score>=700, MEDIUM if 600-699, HIGH if <600>",
  "scoreBreakdown": {
    "payment_history": <integer out of 35, higher for on-time payments>,
    "debt_ratio": <integer out of 30, higher for lower debt-to-income>,
    "average_balance": <integer out of 35, higher for healthy balances>
  }
}`,
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from GROQ" });
      }

      const analysis = JSON.parse(content);
      console.log(`Score: ${analysis.creditScore}, Risk: ${analysis.riskLevel}, Bills: ${analysis.bills?.length ?? 0}`);
      res.json({ analysis });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to analyze PDF" });
    } finally {
      // Clean up temp files
      [tmpPdf, ...fs.readdirSync(os.tmpdir())
        .filter(f => f.startsWith(tmpId))
        .map(f => path.join(os.tmpdir(), f))
      ].forEach(f => { try { fs.unlinkSync(f); } catch {} });
    }
  });

  app.post("/api/analyze-credit", async (req, res) => {
    try {
      if (!groq) {
        return res.status(503).json({ error: "GROQ_API_KEY not configured" });
      }
      const { financialData } = req.body;
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        messages: [
          { role: "system", content: "You are a credit scoring AI. Return ONLY raw valid JSON." },
          {
            role: "user",
            content: `Analyze this financial data and return a credit summary:
${JSON.stringify(financialData)}

Return: { "summary": "<one sentence>", "confidence": <0-1>, "recommendedAction": "<string>" }`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      res.json({ analysis: result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze credit data" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
