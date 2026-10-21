// Phone photos are 3-8MB each. Three of them, base64-encoded (which adds ~33%),
// blow past the serverless request body limit — the platform rejects the whole
// request with a plain-text "Request Entity Too Large" before our route ever
// runs, so the user sees a JSON parse error and we never even learn about it.
//
// Compressing in the browser fixes that at the source, and costs nothing in
// accuracy: vision models downsample to ~1024px tiles anyway, so a 1600px JPEG
// reads handwriting just as well as a 4000px original.

export interface CompressResult {
  dataUrl: string;
  bytes: number;
  originalBytes: number;
  width: number;
  height: number;
}

// Total base64 payload we allow for one scan request. The platform limit is
// 4.5MB; staying well under leaves room for JSON overhead and the paperId.
export const PAYLOAD_BUDGET_BYTES = 3_200_000;

// Tried in order until the whole batch fits the budget. Quality drops before
// resolution does, since legibility survives compression better than downscaling.
const STEPS: Array<{ maxEdge: number; quality: number }> = [
  { maxEdge: 1600, quality: 0.82 },
  { maxEdge: 1600, quality: 0.7 },
  { maxEdge: 1280, quality: 0.68 },
  { maxEdge: 1024, quality: 0.6 },
];

// Floor on a page's share of the budget. Below this we are shaving bytes off
// handwriting that still has to be read, so we let the request run a little
// larger instead.
const MIN_TARGET_BYTES = 150_000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

/** One decoded photo, plus the handle that frees its pixels again. */
interface Source {
  image: CanvasImageSource;
  width: number;
  height: number;
  release(): void;
}

// A 12MP photo is ~48MB once decoded, and eight of them is more memory than a
// 2-3GB phone will hand a tab before killing it. createImageBitmap's resize
// options make the *decoder* do the downscale, so the full-size bitmap is never
// allocated; the element is only there to measure the photo first, and drops
// its own decode as soon as the bitmap exists.
async function loadSource(file: File, maxEdge: number): Promise<Source> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));

  if (scale < 1 && typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        resizeWidth: Math.max(1, Math.round(img.naturalWidth * scale)),
        resizeHeight: Math.max(1, Math.round(img.naturalHeight * scale)),
        resizeQuality: "high",
      });
      img.removeAttribute("src");
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Older WebViews reject the resize options; the element still has pixels.
    }
  }

  return {
    image: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => img.removeAttribute("src"),
  };
}

/** Rough decoded size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.round((b64.length * 3) / 4);
}

// One canvas is reused for every page of a batch: each resize replaces the
// backing store instead of adding another one.
function encodeTo(
  canvas: HTMLCanvasElement,
  src: Source,
  maxEdge: number,
  quality: number
): { dataUrl: string; width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(src.width, src.height));
  const width = Math.max(1, Math.round(src.width * scale));
  const height = Math.max(1, Math.round(src.height * scale));

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image.");
  // White backdrop so transparent PNGs don't come out black once flattened.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src.image, 0, 0, width, height);

  return { dataUrl: canvas.toDataURL("image/jpeg", quality), width, height };
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/** Compress one image at the given step. */
export async function compressImage(
  file: File,
  step = STEPS[0]
): Promise<CompressResult> {
  const canvas = document.createElement("canvas");
  const src = await loadSource(file, step.maxEdge);
  try {
    const { dataUrl, width, height } = encodeTo(canvas, src, step.maxEdge, step.quality);
    return {
      dataUrl,
      bytes: dataUrlBytes(dataUrl),
      originalBytes: file.size,
      width,
      height,
    };
  } finally {
    src.release();
    releaseCanvas(canvas);
  }
}

/**
 * Compress a batch one photo at a time, stepping quality down as soon as a page
 * overruns its share of the budget. Returns the images plus whether it had to
 * degrade them, so the UI can say something honest.
 *
 * `budgetBytes` is what is left of the payload — pages added in an earlier call
 * are already spent, and a second batch that assumed the whole budget is how a
 * six-photo request still ends up a 413.
 */
export async function compressBatch(
  files: File[],
  onProgress?: (done: number, total: number) => void,
  budgetBytes = PAYLOAD_BUDGET_BYTES
): Promise<{ results: CompressResult[]; totalBytes: number; degraded: boolean }> {
  const canvas = document.createElement("canvas");
  const results: CompressResult[] = [];
  let remaining = Math.max(0, budgetBytes);
  // Never walks back up: what the first photo needed, a photo of the next page
  // of the same paper needs too, and re-encoding costs a whole decode.
  let step = 0;

  try {
    for (let i = 0; i < files.length; i++) {
      const target = Math.max(MIN_TARGET_BYTES, remaining / (files.length - i));
      const src = await loadSource(files[i], STEPS[step].maxEdge);
      try {
        let out = encodeTo(canvas, src, STEPS[step].maxEdge, STEPS[step].quality);
        let bytes = dataUrlBytes(out.dataUrl);
        // Stepping down while this photo is still decoded is the cheap moment
        // to do it — the whole batch used to be re-encoded from scratch.
        while (bytes > target && step < STEPS.length - 1) {
          step++;
          out = encodeTo(canvas, src, STEPS[step].maxEdge, STEPS[step].quality);
          bytes = dataUrlBytes(out.dataUrl);
        }
        results.push({
          dataUrl: out.dataUrl,
          bytes,
          originalBytes: files[i].size,
          width: out.width,
          height: out.height,
        });
        remaining = Math.max(0, remaining - bytes);
      } finally {
        src.release();
      }
      onProgress?.(i + 1, files.length);
    }
  } finally {
    releaseCanvas(canvas);
  }

  return {
    results,
    totalBytes: results.reduce((n, r) => n + r.bytes, 0),
    degraded: step > 0,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
