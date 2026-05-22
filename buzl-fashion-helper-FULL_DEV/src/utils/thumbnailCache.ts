const MAX_DATA_URL_SIZE = 280_000;

const keyFor = (productId: string, kind: "main" | "reference") =>
  `buzl_thumb_${kind}_${productId}`;

export const getCachedThumb = (productId: string, kind: "main" | "reference"): string | null => {
  try {
    return localStorage.getItem(keyFor(productId, kind));
  } catch {
    return null;
  }
};

export const setCachedThumb = (productId: string, kind: "main" | "reference", dataUrl: string) => {
  if (!dataUrl || dataUrl.length > MAX_DATA_URL_SIZE) return;
  try {
    localStorage.setItem(keyFor(productId, kind), dataUrl);
  } catch {
    // best-effort cache
  }
};
