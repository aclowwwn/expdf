import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import { config } from "./config";
import { httpLogger, logger } from "./logger";
import { RenderPdfRequestBody, RenderPptxRequestBody } from "./types";
import { renderPdfFromHtml } from "./puppeteer";
import { renderPptxFromHtml } from "./pptx";

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header("x-api-key");
  if (!apiKey || apiKey !== config.apiKey) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

function validateHtmlSize(html: string): boolean {
  return Buffer.byteLength(html, "utf8") <= config.maxHtmlBytes;
}

export function createApp() {
  const app = express();
  const verboseErrors = process.env.VERBOSE_ERRORS === "1";

  app.use(httpLogger);
  app.use((req, res, next) => {
    const start = Date.now();
    logger.info({ method: req.method, path: req.path }, "request_received");
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      logger.info(
        { method: req.method, path: req.path, statusCode: res.statusCode, durationMs },
        "request_completed"
      );
    });
    next();
  });
  app.use(
    bodyParser.json({
      limit: "6mb"
    })
  );

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      build: "0.1.0",
      nodeEnv: config.nodeEnv
    });
  });

  app.post("/render-pdf", authMiddleware, async (req: Request, res: Response) => {
    const body = req.body as RenderPdfRequestBody;

    logger.info(
      {
        route: "/render-pdf",
        bodySummary: {
          htmlLength: typeof body?.html === "string" ? body.html.length : 0,
          width: body?.width,
          height: body?.height,
          hasMargin: Boolean(body?.margin),
          waitUntil: body?.waitUntil,
          emulateMedia: body?.emulateMedia,
          deviceScaleFactor: body?.deviceScaleFactor
        }
      },
      "render-pdf payload_received"
    );

    if (!body || typeof body.html !== "string" || typeof body.width !== "string" || typeof body.height !== "string") {
      res.status(400).json({ error: "invalid_request", details: "html, width, and height are required" });
      return;
    }

    if (!validateHtmlSize(body.html)) {
      res.status(413).json({ error: "invalid_request", details: "HTML payload too large" });
      return;
    }

    const margin = body.margin ?? { top: "0in", right: "0in", bottom: "0in", left: "0in" };

    try {
      // Use "load" so we don't hang on all external resources (fonts, CDN, blob URLs).
      const waitUntil = (body.waitUntil === "networkidle0" ? "load" : body.waitUntil) ?? "load";
      const buffer = await renderPdfFromHtml(
        body.html,
        {
          width: body.width,
          height: body.height,
          margin,
          waitUntil,
          // Use print media so @page + print styles control exact layout.
          emulateMedia: "print",
          // Use scale 1; we rely on CSS @page and slide sizes instead.
          scale: 1
        } as any
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'inline; filename="document.pdf"');
      res.status(200).send(buffer);
    } catch (err: any) {
      const errMessage = err?.message ?? String(err);
      logger.error({ err, message: errMessage, stack: err?.stack }, "PDF render failed");
      const details = config.nodeEnv === "development" || verboseErrors ? errMessage : "render_failed";
      res.status(502).json({ error: "render_failed", details });
    }
  });

  app.post("/render-pptx", authMiddleware, async (req: Request, res: Response) => {
    const body = req.body as RenderPptxRequestBody;

    logger.info(
      {
        route: "/render-pptx",
        bodySummary: {
          htmlLength: typeof body?.html === "string" ? body.html.length : 0,
          slideWidthPx: body?.slideWidthPx,
          slideHeightPx: body?.slideHeightPx,
          pptWidthIn: body?.pptWidthIn,
          pptHeightIn: body?.pptHeightIn,
          waitUntil: body?.waitUntil,
          emulateMedia: body?.emulateMedia,
          deviceScaleFactor: body?.deviceScaleFactor
        }
      },
      "render-pptx payload_received"
    );

    if (
      !body ||
      typeof body.html !== "string" ||
      typeof body.slideWidthPx !== "number" ||
      typeof body.slideHeightPx !== "number" ||
      typeof body.pptWidthIn !== "number" ||
      typeof body.pptHeightIn !== "number"
    ) {
      res.status(400).json({ error: "invalid_request", details: "html, slideWidthPx, slideHeightPx, pptWidthIn, pptHeightIn are required" });
      return;
    }

    if (!validateHtmlSize(body.html)) {
      res.status(413).json({ error: "invalid_request", details: "HTML payload too large" });
      return;
    }

    try {
      const buffer = await renderPptxFromHtml({
        ...body,
        waitUntil: body.waitUntil ?? "networkidle0",
        emulateMedia: body.emulateMedia ?? "screen",
        deviceScaleFactor: body.deviceScaleFactor ?? 2
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      res.setHeader("Content-Disposition", 'attachment; filename="presentation.pptx"');
      res.status(200).send(buffer);
    } catch (err: any) {
      const errMessage = err?.message ?? String(err);
      logger.error({ err, message: errMessage, stack: err?.stack }, "PPTX render failed");
      const details = config.nodeEnv === "development" || verboseErrors ? errMessage : "render_failed";
      res.status(502).json({ error: "render_failed", details });
    }
  });

  // Generic error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "Unhandled error");
    res
      .status(500)
      .json({
        error: "render_failed",
        details:
          config.nodeEnv === "development" || verboseErrors ? String(err?.message ?? err) : "internal_error"
      });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(config.port, () => {
    logger.info({ port: config.port }, "PDF/PPTX worker listening");
  });
}

