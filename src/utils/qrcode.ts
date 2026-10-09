import QRCode from 'qrcode';

export async function generateQrDataUrl(
  text: string,
  options?: { width?: number; margin?: number; color?: { dark?: string; light?: string } }
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: options?.width || 250,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#0f172a',
        light: options?.color?.light || '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    return '';
  }
}

export async function generateQrSvg(
  text: string,
  options?: { width?: number; margin?: number }
): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      width: options?.width || 200,
      margin: options?.margin || 1,
    });
  } catch (err) {
    console.error('Failed to generate QR SVG:', err);
    return '';
  }
}
