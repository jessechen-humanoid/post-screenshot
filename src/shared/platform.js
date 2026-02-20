export function detectPlatform(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (host.includes('facebook.com')) {
      return 'facebook';
    }

    if (host.includes('instagram.com')) {
      return 'instagram';
    }

    if (host.includes('threads.net') || host.includes('threads.com')) {
      return 'threads';
    }

    return null;
  } catch {
    return null;
  }
}
