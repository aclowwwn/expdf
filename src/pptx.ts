import { Page } from "puppeteer";
import PptxGenJS from "pptxgenjs";
import { RenderPptxRequestBody } from "./types";
import { withPage } from "./puppeteer";
import { config } from "./config";

export async function renderPptxFromHtml(body: RenderPptxRequestBody): Promise<Buffer> {
  const result = await withPage(async (page: Page) => {
    await page.setViewport({
      width: body.slideWidthPx,
      height: body.slideHeightPx,
      deviceScaleFactor: body.deviceScaleFactor ?? 2
    });

    await page.setContent(body.html, {
      waitUntil: body.waitUntil ?? "networkidle0",
      timeout: config.renderTimeoutMs
    });

    // For v1, single screenshot representing the whole deck.
    const screenshotBuffer = (await page.screenshot({
      type: "png",
      fullPage: true
    })) as Buffer;

    const pptx = new PptxGenJS();
    pptx.defineLayout({
      name: "CUSTOM",
      width: body.pptWidthIn,
      height: body.pptHeightIn
    });
    pptx.layout = "CUSTOM";

    const slide = pptx.addSlide();
    const imageData = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
    slide.addImage({
      data: imageData,
      x: 0,
      y: 0,
      w: body.pptWidthIn,
      h: body.pptHeightIn
    });

    const pptxArrayBuffer = await pptx.write({ outputType: "arraybuffer" });
    return Buffer.from(pptxArrayBuffer as ArrayBuffer);
  }, config.renderTimeoutMs);

  return result;
}

