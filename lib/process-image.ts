import sharp from "sharp";

export function processImage(input: Buffer): Promise<Buffer> {
  return sharp(input, { limitInputPixels: 25000000, animated: false })
    .rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86 }).toBuffer();
}
