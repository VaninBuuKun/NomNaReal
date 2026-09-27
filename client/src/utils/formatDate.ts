export function formatMessageDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today at ${timeStr}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${timeStr}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${timeStr}`;
  } catch {
    return dateString;
  }
}

export function formatDateDivider(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return 'Hôm nay';
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export function isDifferentDay(d1String: string, d2String?: string): boolean {
  if (!d2String) return true;
  try {
    const d1 = new Date(d1String);
    const d2 = new Date(d2String);
    return d1.toDateString() !== d2.toDateString();
  } catch {
    return false;
  }
}

