import QRCode from 'qrcode';

export async function generate(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { width: 320, margin: 2 });
}
