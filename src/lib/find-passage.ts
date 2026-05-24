export function findPassage(
  text: string,
  name: string,
): { text: string; start: number; end: number } | null {
  const lowerText = text.toLowerCase();
  const lowerName = name.toLowerCase();
  const idx = lowerText.indexOf(lowerName);
  if (idx === -1) return null;

  let start = idx;
  while (start > 0 && start > idx - 150 && !".!?\n".includes(text[start - 1])) start--;
  while (start < text.length && /\s/.test(text[start])) start++;

  let end = idx + name.length;
  while (end < text.length && end < idx + 200 && !".!?\n".includes(text[end])) end++;
  if (end < text.length) end++;

  return { text: text.slice(start, end).trim(), start, end };
}
