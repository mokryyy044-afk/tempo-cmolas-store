const DATA_IMAGE_PREFIX = "data:image/";

export function createSmallCmsCache<T>(value: T): T {
  return stripLargeInlineImages(value) as T;
}

export function safeSetLocalJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(createSmallCmsCache(value)));
  } catch (error) {
    console.warn(`Nie udało się zapisać cache ${key}`, error);
  }
}

function stripLargeInlineImages(value: unknown): unknown {
  if (typeof value === "string") {
    return value.startsWith(DATA_IMAGE_PREFIX) ? "" : value;
  }

  if (Array.isArray(value)) {
    return value.map(stripLargeInlineImages);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, stripLargeInlineImages(item)])
    );
  }

  return value;
}
