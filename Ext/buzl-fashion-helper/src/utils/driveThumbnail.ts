const DRIVE_ID_PATTERNS = [
  /[?&]id=([a-zA-Z0-9_-]{10,})/,
  /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
  /\/folders\/([a-zA-Z0-9_-]{10,})/,
  /\/d\/([a-zA-Z0-9_-]{10,})/,
];

export const extractDriveEntityId = (value?: string | null): string | null => {
  if (!value) return null;
  const input = value.trim();
  if (!input) return null;

  if (/^[a-zA-Z0-9_-]{10,}$/.test(input)) {
    return input;
  }

  for (const pattern of DRIVE_ID_PATTERNS) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
};

export const buildDriveThumbnailUrl = (fileId: string, size = 320): string =>
  `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${size}`;

export const buildThumbnailCandidates = (
  thumbnailUrl?: string | null,
  driveLink?: string | null,
): string[] => {
  const candidates: string[] = [];
  const add = (url?: string | null) => {
    if (!url) return;
    const clean = url.trim();
    if (!clean || candidates.includes(clean)) return;
    candidates.push(clean);
  };

  const thumbId = extractDriveEntityId(thumbnailUrl);
  if (thumbId) add(buildDriveThumbnailUrl(thumbId));
  add(thumbnailUrl);

  const driveId = extractDriveEntityId(driveLink);
  if (driveId) add(buildDriveThumbnailUrl(driveId));

  return candidates;
};
