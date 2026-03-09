// Simple example script to call /render-pptx and write example.pptx

const fs = require("node:fs/promises");

async function main() {
  const url = process.env.WORKER_URL || "http://127.0.0.1:3000";
  const apiKey = process.env.RENDER_API_KEY || "dev-api-key";

  const res = await fetch(`${url}/render-pptx`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      html: "<!doctype html><html><body><h1>Hello PPTX</h1></body></html>",
      slideWidthPx: 1600,
      slideHeightPx: 1200,
      pptWidthIn: 10,
      pptHeightIn: 7.5,
      waitUntil: "networkidle0",
      emulateMedia: "screen",
      deviceScaleFactor: 2
    })
  });

  if (!res.ok) {
    console.error("render-pptx failed", res.status, await res.text());
    process.exit(1);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile("example.pptx", buf);
  console.log("Wrote example.pptx");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

