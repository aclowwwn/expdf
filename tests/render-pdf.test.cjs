const test = require("node:test");
const assert = require("node:assert");

process.env.RENDER_API_KEY = "test-key";

const { createApp } = require("../dist/server.js");

async function startServer() {
  const app = createApp();
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, port });
    });
  });
}

test("render-pdf rejects unauthorized requests", async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.close());

  const res = await fetch(`http://127.0.0.1:${port}/render-pdf`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      html: "<!doctype html><html><body><h1>Hi</h1></body></html>",
      width: "10in",
      height: "7.5in"
    })
  });

  assert.strictEqual(res.status, 401);
});

test("render-pdf succeeds or returns a structured error with valid request", async (t) => {
  const { server, port } = await startServer();
  t.after(() => server.close());

  const res = await fetch(`http://127.0.0.1:${port}/render-pdf`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": "test-key"
    },
    body: JSON.stringify({
      html: "<!doctype html><html><body><h1>Hi</h1></body></html>",
      width: "10in",
      height: "7.5in",
      margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" },
      waitUntil: "networkidle0",
      emulateMedia: "print",
      deviceScaleFactor: 2
    })
  });

  if (res.status === 200) {
    const contentType = res.headers.get("content-type") || "";
    assert.ok(contentType.includes("application/pdf"));
    const buf = Buffer.from(await res.arrayBuffer());
    assert.ok(buf.length > 0);
  } else {
    // Environment may not support Chromium; ensure error shape is correct.
    assert.strictEqual(res.status, 502);
    const body = await res.json();
    assert.strictEqual(body.error, "render_failed");
  }
});

