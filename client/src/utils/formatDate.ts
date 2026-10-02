export function formatMessageTime(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

export function formatMessageDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = formatMessageTime(date);

    if (isToday) return `Hôm nay lúc ${timeStr}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Hôm qua lúc ${timeStr}`;
    return `${date.toLocaleDateString('vi-VN')} ${timeStr}`;
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
