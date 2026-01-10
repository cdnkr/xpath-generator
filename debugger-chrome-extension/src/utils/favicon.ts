export function getFaviconUrl(): string {
  // 1. Check for link[rel="icon"] or link[rel="shortcut icon"]
  const link = document.querySelector("link[rel~='icon']");
  if (link && (link as HTMLLinkElement).href) {
    return (link as HTMLLinkElement).href;
  }
  
  // 2. Fallback to default location
  return `${window.location.protocol}//${window.location.host}/favicon.ico`;
}

