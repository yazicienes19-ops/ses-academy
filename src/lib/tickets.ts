import "server-only";

import QRCode from "qrcode";
import { qrInhalt } from "./codes";

export * from "./codes";

const farben = { dark: "#13201a", light: "#ffffff" };

export function qrSvg(token: string): Promise<string> {
  return QRCode.toString(qrInhalt(token), { type: "svg", margin: 1, width: 240, color: farben });
}

/** PNG für E-Mails (SVG zeigen viele Mailprogramme nicht an). */
export function qrPng(token: string): Promise<Buffer> {
  return QRCode.toBuffer(qrInhalt(token), { type: "png", margin: 2, width: 480, color: farben });
}
