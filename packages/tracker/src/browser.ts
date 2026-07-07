export function getCurrentUrl(): string {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    throw new Error("Tracker SDK: getCurrentUrl() requires a browser environment.");
  }

  return window.location.href;
}

export function getUserAgent(): string {
  if (typeof navigator === "undefined") {
    throw new Error("Tracker SDK: getUserAgent() requires a browser environment.");
  }

  return navigator.userAgent;
}

