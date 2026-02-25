import { useState, useEffect, useRef } from 'react';
import { readFile } from '../shell/filesystem';

// --- Types ---

export interface ChecklistItem {
  text: string;
  checked: boolean;
}

export interface JournalEntry {
  title: string;
  status: string;
  content: string;
}

export interface MilestoneData {
  activeMilestone: string | null;
  status: string;
  checklistItems: ChecklistItem[];
  journalEntries: JournalEntry[];
}

const EMPTY_DATA: MilestoneData = {
  activeMilestone: null,
  status: '',
  checklistItems: [],
  journalEntries: [],
};

// --- Parser (pure function, never throws) ---

export function parseImplementationMd(raw: string): MilestoneData {
  try {
    const lines = raw.split('\n');

    // 1. Parse status snapshot table — find first row where status is NOT [COMPLETED]
    let activeMilestone: string | null = null;
    let milestoneStatus = '';
    const tableStartRegex = /^\|\s*Milestone\s*\|/i;
    let inTable = false;

    for (const line of lines) {
      if (tableStartRegex.test(line)) {
        inTable = true;
        continue;
      }
      if (inTable) {
        // Skip separator rows
        if (/^\|[-\s|]+\|$/.test(line.trim())) continue;
        // Stop at non-table content
        if (!line.trim().startsWith('|')) {
          inTable = false;
          continue;
        }
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length < 2) continue;
        const name = cells[0].replace(/\*\*/g, '');
        const status = cells[1].replace(/`/g, '').trim();
        // Skip section headers like "— V2 —"
        if (name.startsWith('—') || name.startsWith('-')) continue;
        if (status !== '[COMPLETED]') {
          activeMilestone = name;
          milestoneStatus = status;
          break;
        }
      }
    }

    // If all are complete, return early
    if (!activeMilestone) {
      return { activeMilestone: null, status: 'ALL_COMPLETE', checklistItems: [], journalEntries: [] };
    }

    // 2. Extract milestone number from name (e.g., "M9 — Planning Drawer Content" → "9")
    const milestoneNumMatch = activeMilestone.match(/M(\d+)/i);
    if (!milestoneNumMatch) {
      return { activeMilestone, status: milestoneStatus, checklistItems: [], journalEntries: [] };
    }
    const milestoneNum = milestoneNumMatch[1];

    // 3. Find the ## MILESTONE N heading
    const headingRegex = new RegExp(`^##\\s+MILESTONE\\s+${milestoneNum}\\b`, 'i');
    let sectionStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (headingRegex.test(lines[i])) {
        sectionStart = i;
        break;
      }
    }

    if (sectionStart === -1) {
      return { activeMilestone, status: milestoneStatus, checklistItems: [], journalEntries: [] };
    }

    // Find section end (next ## heading or end of file)
    let sectionEnd = lines.length;
    for (let i = sectionStart + 1; i < lines.length; i++) {
      if (/^##\s+(?!#)/.test(lines[i]) && !lines[i].startsWith('###')) {
        sectionEnd = i;
        break;
      }
    }

    const sectionLines = lines.slice(sectionStart, sectionEnd);

    // 4. Extract Definition of Done checklist
    const checklistItems: ChecklistItem[] = [];
    let inChecklist = false;
    for (const line of sectionLines) {
      if (/^###\s+Definition of Done/i.test(line)) {
        inChecklist = true;
        continue;
      }
      if (inChecklist && /^###/.test(line)) {
        inChecklist = false;
        continue;
      }
      if (inChecklist) {
        const checkMatch = line.match(/^-\s+\[([ xX])\]\s+(.*)/);
        if (checkMatch) {
          checklistItems.push({
            checked: checkMatch[1].toLowerCase() === 'x',
            text: checkMatch[2].trim(),
          });
        }
      }
    }

    // 5. Extract plan journal #### sub-entries with status tags
    const journalEntries: JournalEntry[] = [];
    let currentEntry: { title: string; status: string; contentLines: string[] } | null = null;

    for (const line of sectionLines) {
      const entryMatch = line.match(/^####\s+(.*)/);
      if (entryMatch) {
        if (currentEntry) {
          journalEntries.push({
            title: currentEntry.title,
            status: currentEntry.status,
            content: currentEntry.contentLines.join('\n').trim(),
          });
        }
        const titleRaw = entryMatch[1].trim();
        const statusMatch = titleRaw.match(/\[([A-Z\s]+)\]/);
        currentEntry = {
          title: titleRaw.replace(/\s*\[[A-Z\s]+\]\s*/, '').trim(),
          status: statusMatch ? `[${statusMatch[1]}]` : '',
          contentLines: [],
        };
        continue;
      }
      if (currentEntry) {
        currentEntry.contentLines.push(line);
      }
    }
    if (currentEntry) {
      journalEntries.push({
        title: currentEntry.title,
        status: currentEntry.status,
        content: currentEntry.contentLines.join('\n').trim(),
      });
    }

    return { activeMilestone, status: milestoneStatus, checklistItems, journalEntries };
  } catch {
    return EMPTY_DATA;
  }
}

// --- Hook ---

export function useMilestoneReader(projectRoot: string | undefined) {
  const [data, setData] = useState<MilestoneData>(EMPTY_DATA);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastContentRef = useRef<string>('');

  useEffect(() => {
    if (!projectRoot) {
      setData(EMPTY_DATA);
      setError('No project root configured');
      setLoading(false);
      return;
    }

    let cancelled = false;
    lastContentRef.current = '';

    async function fetchAndParse() {
      try {
        const filePath = `${projectRoot}/IMPLEMENTATION.md`;
        const content = await readFile(filePath);
        if (cancelled) return;

        // Skip re-parse if content unchanged
        if (content === lastContentRef.current) return;
        lastContentRef.current = content;

        setData(parseImplementationMd(content));
        setError(null);
      } catch {
        if (cancelled) return;
        setData(EMPTY_DATA);
        setError('No IMPLEMENTATION.md found in project root');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    fetchAndParse();

    const interval = setInterval(fetchAndParse, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectRoot]);

  return { data, error, loading };
}
