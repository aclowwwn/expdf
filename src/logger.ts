import pino from "pino";
import pinoHttp from "pino-http";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: ["req.headers.authorization", "req.headers.cookie", "req.headers.x-api-key"],
  transport: isDev
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" }
      }
    : undefined
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: function (res, err) {
    const statusCode = res.statusCode ?? 200;
    if (err || statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: function () {
    return "request_completed";
  }
});
