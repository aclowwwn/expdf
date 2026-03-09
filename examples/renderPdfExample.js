// Simple example script to call /render-pdf and write example.pdf

const fs = require("node:fs/promises");

async function main() {
  const url = process.env.WORKER_URL || "http://127.0.0.1:3010";
  const apiKey = process.env.RENDER_API_KEY || "dev-api-key";

  const res = await fetch(`${url}/render-pdf`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      html: "<!doctype html><html><body><h1>Hello PDF</h1></body></html>",
      width: "10in",
      height: "7.5in",
      margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" },
      waitUntil: "networkidle0",
      emulateMedia: "print",
      deviceScaleFactor: 2
    })
  });

  if (!res.ok) {
    console.error("render-pdf failed", res.status, await res.text());
    process.exit(1);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile("example.pdf", buf);
  console.log("Wrote example.pdf");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

