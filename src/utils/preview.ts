import { ensureHttps } from './url';

// Get high quality preview using a more reliable service
export function getWebsitePreview(url: string): string {
  const secureUrl = ensureHttps(url);
  return `https://image.thum.io/get/width/400/crop/800/maxAge/24/noanimate/${encodeURIComponent(secureUrl)}`;
}

// Fallback to favicon if preview fails
export function getFaviconUrl(url: string): string {
  const secureUrl = ensureHttps(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(secureUrl)}&sz=128`;
}

// Main preview generation function
export async function generatePreview(url: string): Promise<string> {
  try {
    const previewUrl = getWebsitePreview(url);
    // Test if the preview service is responding
    const response = await fetch(previewUrl, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error('Preview service not available');
    }
    return previewUrl;
  } catch (error) {
    console.warn('Falling back to favicon:', error);
    return getFaviconUrl(url);
  }
}
