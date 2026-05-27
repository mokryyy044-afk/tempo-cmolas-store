import { uploadRemoteImage } from "@/lib/remoteCms";

const MAX_UPLOAD_SIZE = 15 * 1024 * 1024;
const TARGET_WIDTHS = [1600, 1200, 900, 700];
const TARGET_QUALITIES = [0.78, 0.72, 0.66];
const MAX_OPTIMIZED_DATA_URL_LENGTH = 1_200_000;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
const ACCEPTED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "heic", "heif"];

export const IMAGE_TOO_LARGE_ERROR = "Plik jest za duży";
export const IMAGE_SAVE_SUCCESS = "Zdjęcie zapisane";
export const IMAGE_OPTIMIZED_SUCCESS = "Zdjęcie zostało automatycznie zoptymalizowane";
export const IMAGE_SAVE_ERROR = "Nie udało się zapisać zdjęcia";
export const IMAGE_STORAGE_ERROR = "Pamięć przeglądarki jest pełna. Zdjęcie zostało zoptymalizowane, ale nadal jest za duże. Użyj mniejszego pliku albo linku URL";

export type ImageUploadStage = "walidacja" | "kompresja" | "zapis";

type UploadFileLike = Pick<File, "name" | "type" | "size">;

export type ImageUploadResult = {
  src: string;
  schema: "tempo-image-v1";
  type: "upload";
  mime: string;
  originalName: string;
  originalSize: number;
  width: number;
  height: number;
  compressed: boolean;
};

export class ImageUploadError extends Error {
  stage: ImageUploadStage;
  fileType: string;
  fileSize: number;

  constructor(message: string, stage: ImageUploadStage, file?: UploadFileLike) {
    super(message);
    this.name = "ImageUploadError";
    this.stage = stage;
    this.fileType = getFileType(file);
    this.fileSize = file?.size ?? 0;
  }
}

export function isStorageQuotaError(error: unknown) {
  return error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
}

export function formatImageUploadError(error: unknown, file?: UploadFileLike) {
  if (error instanceof ImageUploadError) {
    return `${error.message}. Typ: ${error.fileType}. Rozmiar: ${formatFileSize(error.fileSize)}. Etap: ${error.stage}.`;
  }

  return `${IMAGE_SAVE_ERROR}. Typ: ${getFileType(file)}. Rozmiar: ${formatFileSize(file?.size ?? 0)}. Etap: zapis.`;
}

export function formatStorageImageError(error: unknown) {
  if (isStorageQuotaError(error)) {
    return `${IMAGE_STORAGE_ERROR}. Etap: zapis.`;
  }

  return `${IMAGE_SAVE_ERROR}. Etap: zapis.`;
}

export function formatStorageDataError(error: unknown) {
  if (isStorageQuotaError(error)) {
    return "Błąd zapisu. Pamięć przeglądarki jest pełna.";
  }

  return "Błąd zapisu";
}

export function normalizeImageSource(value?: string | null) {
  const image = String(value ?? "").trim();
  if (!image) return "";

  if (image.startsWith("data:image/") || image.startsWith("/") || image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return image;
}

export async function uploadImage(file?: File): Promise<ImageUploadResult> {
  validateImageType(file);

  let originalDataUrl = "";
  try {
    originalDataUrl = await readFileAsDataUrl(file);
  } catch (error) {
    throw error instanceof ImageUploadError ? error : new ImageUploadError(IMAGE_SAVE_ERROR, "zapis", file);
  }

  try {
    const compressed = await optimizeImage(originalDataUrl);
    const bestImage = chooseBestImage(compressed, createOriginalResult(originalDataUrl, file));
    const remoteUrl = await uploadRemoteImage(bestImage.src).catch((error) => {
      console.error("Upload do Supabase Storage nie powiódł się", error);
      throw new ImageUploadError(error instanceof Error ? error.message : IMAGE_SAVE_ERROR, "zapis", file);
    });
    return {
      ...bestImage,
      src: remoteUrl || bestImage.src,
      schema: "tempo-image-v1",
      type: "upload",
      originalName: file.name,
      originalSize: file.size
    };
  } catch {
    const original = createOriginalResult(originalDataUrl, file);
    const remoteUrl = await uploadRemoteImage(original.src).catch((error) => {
      console.error("Upload oryginalnego zdjęcia do Supabase Storage nie powiódł się", error);
      throw new ImageUploadError(error instanceof Error ? error.message : IMAGE_SAVE_ERROR, "zapis", file);
    });
    return {
      ...original,
      src: remoteUrl || original.src,
      schema: "tempo-image-v1",
      type: "upload",
      originalName: file.name,
      originalSize: file.size
    };
  }
}

export async function readAndCompressImage(file?: File): Promise<string> {
  const result = await uploadImage(file);
  return result.src;
}

export function validateImageFileForUpload(file?: UploadFileLike) {
  if (!file) {
    throw new ImageUploadError(IMAGE_SAVE_ERROR, "walidacja", file);
  }

  const extension = getFileExtension(file);
  const validType = ACCEPTED_IMAGE_TYPES.includes(file.type);
  const validExtension = ACCEPTED_IMAGE_EXTENSIONS.includes(extension);

  if (!validType && !validExtension) {
    throw new ImageUploadError("Wybierz plik JPG, PNG, WEBP albo HEIC", "walidacja", file);
  }

  // Large valid images are not rejected here. The upload helper optimizes them before save.
}

function validateImageFile(file?: File): asserts file is File {
  validateImageFileForUpload(file);
}

function validateImageType(file?: File): asserts file is File {
  if (!file) {
    throw new ImageUploadError(IMAGE_SAVE_ERROR, "walidacja", file);
  }

  const extension = getFileExtension(file);
  const validType = ACCEPTED_IMAGE_TYPES.includes(file.type);
  const validExtension = ACCEPTED_IMAGE_EXTENSIONS.includes(extension);

  if (!validType && !validExtension) {
    throw new ImageUploadError("Wybierz plik JPG, PNG, WEBP albo HEIC", "walidacja", file);
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new ImageUploadError(IMAGE_SAVE_ERROR, "zapis", file));
    reader.readAsDataURL(file);
  });
}

function optimizeImage(dataUrl: string): Promise<Pick<ImageUploadResult, "src" | "mime" | "width" | "height" | "compressed">> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      try {
        const candidates = createOptimizedCandidates(image);
        const safeCandidate = candidates.find((candidate) => candidate.src.length <= MAX_OPTIMIZED_DATA_URL_LENGTH);
        resolve(safeCandidate ?? candidates[candidates.length - 1]);
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => reject(new Error("Nie udało się otworzyć obrazu"));
    image.src = dataUrl;
  });
}

function createOptimizedCandidates(image: HTMLImageElement) {
  const candidates: Pick<ImageUploadResult, "src" | "mime" | "width" | "height" | "compressed">[] = [];

  for (const maxWidth of TARGET_WIDTHS) {
    const scale = image.width > maxWidth ? maxWidth / image.width : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Brak obsługi canvas");
    }

    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of TARGET_QUALITIES) {
      const webp = canvas.toDataURL("image/webp", quality);
      if (webp.startsWith("data:image/webp")) {
        candidates.push({ src: webp, mime: "image/webp", width, height, compressed: true });
      }
    }
  }

  if (!candidates.length) {
    throw new Error("Brak obsługi eksportu WEBP");
  }

  return candidates.sort((a, b) => a.src.length - b.src.length);
}

function createOriginalResult(dataUrl: string, file: File): Pick<ImageUploadResult, "src" | "mime" | "width" | "height" | "compressed"> {
  return {
    src: dataUrl,
    mime: extractMimeFromDataUrl(dataUrl) || file.type || `image/${getFileExtension(file)}`,
    width: 0,
    height: 0,
    compressed: false
  };
}

function chooseBestImage(
  compressed: Pick<ImageUploadResult, "src" | "mime" | "width" | "height" | "compressed">,
  original: Pick<ImageUploadResult, "src" | "mime" | "width" | "height" | "compressed">
) {
  if (original.src.length <= MAX_UPLOAD_SIZE && original.src.length < compressed.src.length) {
    return original;
  }

  return compressed;
}

function getFileExtension(file: UploadFileLike) {
  return file.name.toLowerCase().split(".").pop() ?? "";
}

function getFileType(file?: UploadFileLike) {
  if (!file) return "brak pliku";
  return file.type || `.${getFileExtension(file) || "nieznany"}`;
}

function extractMimeFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match?.[1] ?? "";
}

function formatFileSize(size: number) {
  if (size <= 0) return "0 KB";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}
