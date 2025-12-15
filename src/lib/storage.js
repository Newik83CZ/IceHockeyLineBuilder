const KEY = "ihlbuilder_v1";

export function loadAppData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAppData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}