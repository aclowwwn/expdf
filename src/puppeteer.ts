import puppeteer, { Browser, Page, PDFOptions, PuppeteerLifeCycleEvent } from "puppeteer";
import { config } from "./config";
import { logger } from "./logger";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    browserPromise = puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      // Required on many container hosts (incl. Railway) where Chromium sandboxing isn't available.
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      ...(executablePath ? { executablePath } : {})
    });
  }
  return browserPromise;
}

export async function withPage<T>(
  fn: (page: Page) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const timeout = setTimeout(() => {
      page.close().catch((err: unknown) => {
        logger.warn({ err }, "Failed to close page after timeout");
      });
    }, timeoutMs);

    const result = await fn(page);
    clearTimeout(timeout);
    return result;
  } finally {
    if (!page.isClosed()) {
      await page.close();
    }
  }
}

export async function renderPdfFromHtml(
  html: string,
  options: PDFOptions & { waitUntil: PuppeteerLifeCycleEvent; emulateMedia: "print" | "screen" }
): Promise<Buffer> {
  const navigationTimeoutMs = config.renderTimeoutMs;
  return withPage(async (page) => {
    // Set viewport based on width/height in inches (assuming 96 DPI), without extra scaling.
    const widthMatch = typeof options.width === "string" ? options.width.match(/^([\d.]+)in$/) : null;
    const heightMatch = typeof options.height === "string" ? options.height.match(/^([\d.]+)in$/) : null;
    if (widthMatch && heightMatch) {
      const wIn = parseFloat(widthMatch[1]);
      const hIn = parseFloat(heightMatch[1]);
      const widthPx = Math.round(wIn * 96);
      const heightPx = Math.round(hIn * 96);
      await page.setViewport({ width: widthPx, height: heightPx, deviceScaleFactor: 1 });
    }

    await page.setContent(html, {
      waitUntil: options.waitUntil,
      timeout: navigationTimeoutMs
    });
    await page.emulateMediaType(options.emulateMedia);

    const pdfBuffer = (await page.pdf({
      width: options.width,
      height: options.height,
      margin: options.margin,
      printBackground: true,
      // Let @page size from CSS control the final page size so slides fit exactly.
      preferCSSPageSize: true,
      scale: 1
    })) as Buffer;

    return pdfBuffer;
  }, config.renderTimeoutMs);
}
