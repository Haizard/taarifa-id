export const MAX_PHOTO_BYTES = 1024 * 1024; // 1MB

export interface ResizeResult {
  dataUrl: string;
  width: number;
  height: number;
}

export function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read image'));
    };
    img.src = url;
  });
}

export function resizeImage(img: HTMLImageElement, maxSize = 800): ResizeResult {
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width, height };
}

export function fileToResizedDataUrl(file: File): Promise<string> {
  return readImage(file).then((img) => resizeImage(img).dataUrl);
}
