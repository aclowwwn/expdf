export interface MarginConfig {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface RenderPdfRequestBody {
  html: string;
  width: string;
  height: string;
  margin?: MarginConfig;
  waitUntil?: "networkidle0" | "load" | "domcontentloaded" | "networkidle2";
  emulateMedia?: "print" | "screen";
  deviceScaleFactor?: number;
}

export interface RenderPptxRequestBody {
  html: string;
  slideWidthPx: number;
  slideHeightPx: number;
  pptWidthIn: number;
  pptHeightIn: number;
  waitUntil?: "networkidle0" | "load" | "domcontentloaded" | "networkidle2";
  emulateMedia?: "print" | "screen";
  deviceScaleFactor?: number;
}
