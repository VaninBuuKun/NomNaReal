const STORAGE_KEY = "nomna_read_markers";

type MarkerMap = Record<string, string>;

function readAll(): MarkerMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MarkerMap) : {};
  } catch {
    return {};
  }
}

/** Timestamp (ISO) of the newest message the user has actually seen in a channel. */
export function getReadMarker(channelId: string): string | null {
  return readAll()[channelId] ?? null;
}

/** Only ever moves forward, so stale callbacks can't rewind the marker. */
export function setReadMarker(channelId: string, createdAt: string): void {
  try {
    const all = readAll();
    const prev = all[channelId];
    if (prev && Date.parse(prev) >= Date.parse(createdAt)) return;
    all[channelId] = createdAt;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: unread divider simply won't persist */
  }
}
