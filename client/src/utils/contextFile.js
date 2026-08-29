// Local calendar date (YYYY-MM-DD). toISOString() would use UTC and can land on
// the wrong day for anyone west of Greenwich in the evening.
export function todayStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Files an entry under its own heading, creating the section if absent and
// otherwise inserting at the end of that section. Appending everything to the
// end of the document would file a weight entry under "Injury Log", which the
// coach reads as an injury.
export function appendUnderHeading(content, heading, entry) {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);

  if (start === -1) {
    return `${content.trimEnd()}\n\n${marker}\n${entry}\n`;
  }

  const afterHeading = start + marker.length;
  const nextHeading = content.indexOf('\n## ', afterHeading);
  const sectionEnd = nextHeading === -1 ? content.length : nextHeading;

  const before = content.slice(0, sectionEnd).trimEnd();
  const after = content.slice(sectionEnd);
  // Keep a blank line before whatever heading follows.
  const tail = after ? `\n${after}` : '\n';
  return `${before}\n${entry}${tail}`;
}

export function appendInjury(content, { bodyPart, description, severity }) {
  return appendUnderHeading(
    content,
    'Injury Log',
    `- **${todayStamp()}** ${bodyPart} — ${description} (severity: ${severity})`
  );
}

export function appendWeight(content, weight) {
  return appendUnderHeading(content, 'Weight Log', `- **${todayStamp()}** Weight: ${weight} kg`);
}

export function appendIllness(content, description) {
  return appendUnderHeading(content, 'Illness Log', `- **${todayStamp()}** Illness: ${description}`);
}
