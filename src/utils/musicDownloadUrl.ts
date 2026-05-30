/**
 * When no separate download URL is provided, use the playable audio URL (typical R2 upload).
 */
export function coalesceMusicDownloadUrl(
  audioUrl: string | undefined,
  downloadUrl: string | undefined
): string {
  const download = typeof downloadUrl === 'string' ? downloadUrl.trim() : '';
  if (download) return download;

  return typeof audioUrl === 'string' ? audioUrl.trim() : '';
}
