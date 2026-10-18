// Chhota localStorage cache: pehle cache se turant dikhao, phir server se refresh karo.
// Saari keys "kindred:" prefix ke saath save hoti hain, taaki logout pe ek saath saaf ho sakein.

const PREFIX = 'kindred:';

export function readCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // corrupt data ya storage blocked
  }
}

export function writeCache(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full / private mode: ignore, app bina cache ke bhi chalega
  }
}

// Logout pe zaroor call karo (private chats device pe na rahein)
export function clearCache() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}