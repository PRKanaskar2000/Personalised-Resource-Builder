// Browser-side helpers that turn the rendered resource (an SVG) into a file the user can save.

export const DOWNLOAD_FORMATS = ["png", "jpg", "jpeg", "pdf"] as const;
export type DownloadFormat = (typeof DOWNLOAD_FORMATS)[number];

/** Draw an SVG onto a canvas of the given size */
async function svgToCanvas(svg: string, width: number, height: number) {
  const image = new Image();
  image.src = svgDataUrl(svg);
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(image, 0, 0, width, height);
  return canvas;
}

/**
 * The SVG as a "data:" address for an <img>.
 * It must be a data: address: browsers refuse to turn this kind of image into a PNG/JPG
 * when it is loaded from a web address or a blob: address.
 */
export function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), type, 0.92),
  );
}

/**
 * Wrap one JPEG picture in a single-page PDF.
 * A PDF is a list of numbered objects followed by a table saying where each one starts.
 */
function jpegToPdf(jpeg: Uint8Array, width: number, height: number): Blob {
  // PDF pages are measured in points; 1 pixel = 0.75 points
  const pageWidth = width * 0.75;
  const pageHeight = height * 0.75;
  const draw = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`;
  const objects: (string | Uint8Array)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`],
    [`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`],
    [
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      jpeg,
      "\nendstream",
    ],
  ];

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const write = (piece: string | Uint8Array) => {
    const bytes = typeof piece === "string" ? encoder.encode(piece) : piece;
    parts.push(bytes);
    size += bytes.length;
  };

  write("%PDF-1.4\n");
  objects.forEach((pieces, index) => {
    offsets.push(size);
    write(`${index + 1} 0 obj\n`);
    pieces.forEach(write);
    write("\nendobj\n");
  });
  const tableStart = size;
  write(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((offset) => write(`${String(offset).padStart(10, "0")} 00000 n \n`));
  write(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${tableStart}\n%%EOF`);

  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

/** Turn the SVG into the chosen format and save it as "<name>.<format>" */
export async function downloadSvgAs(svg: string, format: DownloadFormat, name: string, width: number, height: number) {
  const canvas = await svgToCanvas(svg, width, height);
  let file: Blob;
  if (format === "png") {
    file = await canvasToBlob(canvas, "image/png");
  } else {
    const jpeg = await canvasToBlob(canvas, "image/jpeg");
    file = format === "pdf" ? jpegToPdf(new Uint8Array(await jpeg.arrayBuffer()), width, height) : jpeg;
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `${name}.${format}`;
  link.click();
  URL.revokeObjectURL(link.href);
}
