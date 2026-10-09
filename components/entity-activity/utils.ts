import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
} from 'date-fns';

export function initials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function formatCommentRelativeTime(value: string): string {
  try {
    const date = parseISO(value);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return value;
  }
}

export function formatCommentExactTime(value: string): string {
  try {
    return format(parseISO(value), 'MMM d, yyyy · h:mm a');
  } catch {
    return value;
  }
}

export function dayLabel(value: string): string {
  try {
    const date = parseISO(value);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  } catch {
    return 'Earlier';
  }
}

/** Highlight @Name mentions in plain text for display. */
export function renderMentionedContent(
  content: string,
  mentionNames: string[],
): Array<{ text: string; mention: boolean }> {
  if (!content) return [];
  if (!mentionNames.length) return [{ text: content, mention: false }];

  const escaped = mentionNames
    .filter(Boolean)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);
  if (!escaped.length) return [{ text: content, mention: false }];

  const re = new RegExp(`@(${escaped.join('|')})`, 'gi');
  const parts: Array<{ text: string; mention: boolean }> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (match.index > last) {
      parts.push({ text: content.slice(last, match.index), mention: false });
    }
    parts.push({ text: match[0], mention: true });
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    parts.push({ text: content.slice(last), mention: false });
  }
  return parts.length ? parts : [{ text: content, mention: false }];
}
