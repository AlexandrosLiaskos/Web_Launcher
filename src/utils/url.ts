export function ensureHttps(url: string): string {
  if (!url) return url;
  
  try {
    // If URL already has a protocol, return it as is if it's HTTPS
    if (url.startsWith('https://')) {
      return url;
    }
    
    // Remove any existing protocol
    url = url.replace(/^(https?:\/\/)/, '');
    
    // Remove any trailing slashes
    url = url.replace(/\/+$/, '');
    
    // Add https:// protocol
    return `https://${url}`;
  } catch (error) {
    console.error('Error processing URL:', error);
    return url;
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
