import { useCallback } from 'react';
import { useMilestoneReader } from '../../hooks/useMilestoneReader';
import type { PlanningDrawerContent } from '../../types/workspace';
import type { ChecklistItem, JournalEntry } from '../../hooks/useMilestoneReader';

interface MilestoneReaderProps {
  projectRoot: string;
  milestoneVisible: boolean;
  dispatch: React.Dispatch<{ type: 'UPDATE_PLANNING'; planning: Partial<PlanningDrawerContent> }>;
}

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s.includes('COMPLETED')) return 'var(--status-ok)';
  if (s.includes('IN PROGRESS')) return 'var(--status-warn)';
  if (s.includes('BLOCKED')) return 'var(--status-error)';
  return 'var(--text-muted)';
}

function CheckItem({ item }: { item: ChecklistItem }) {
  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      padding: '2px 0',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--font-size-xs)',
      lineHeight: '1.4',
    }}>
      <span style={{
        color: item.checked ? 'var(--status-ok)' : 'var(--text-muted)',
        flexShrink: 0,
      }}>
        {item.checked ? '\u2611' : '\u2610'}
      </span>
      <span style={{
        color: item.checked ? 'var(--text-muted)' : 'var(--text-secondary)',
        textDecoration: item.checked ? 'line-through' : 'none',
      }}>
        {item.text}
      </span>
    </div>
  );
}

function JournalItem({ entry }: { entry: JournalEntry }) {
  return (
    <div style={{
      borderLeft: `2px solid ${statusColor(entry.status)}`,
      paddingLeft: '8px',
      marginBottom: '6px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-xs)',
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>{entry.title}</span>
        {entry.status && (
          <span style={{
            color: statusColor(entry.status),
            fontSize: '8px',
          }}>
            {entry.status}
          </span>
        )}
      </div>
    </div>
  );
}

function MilestoneReader({ projectRoot, milestoneVisible, dispatch }: MilestoneReaderProps) {
  const { data, error, loading } = useMilestoneReader(projectRoot);

  const toggleVisible = useCallback(() => {
    dispatch({ type: 'UPDATE_PLANNING', planning: { milestoneVisible: !milestoneVisible } });
  }, [dispatch, milestoneVisible]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Section header */}
      <button
        onClick={toggleVisible}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
          cursor: 'pointer',
          userSelect: 'none',
          textAlign: 'left',
          width: '100%',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        <span style={{
          display: 'inline-block',
          transform: milestoneVisible ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
          fontSize: '8px',
        }}>
          {'\u25B6'}
        </span>
        Milestones
      </button>

      {/* Content */}
      {milestoneVisible && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 10px',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
        }}>
          {loading && (
            <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
          )}

          {!loading && error && (
            <span style={{ color: 'var(--text-muted)' }}>{error}</span>
          )}

          {!loading && !error && data.status === 'ALL_COMPLETE' && (
            <span style={{ color: 'var(--status-ok)' }}>All milestones complete</span>
          )}

          {!loading && !error && data.activeMilestone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Active milestone title + status */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
              }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {data.activeMilestone}
                </span>
                <span style={{
                  color: statusColor(data.status),
                  fontSize: '8px',
                  padding: '1px 4px',
                  border: `1px solid ${statusColor(data.status)}`,
                  borderRadius: '3px',
                }}>
                  {data.status}
                </span>
              </div>

              {/* Checklist items */}
              {data.checklistItems.length > 0 && (
                <div>
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '8px',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Definition of Done
                  </div>
                  {data.checklistItems.map((item, i) => (
                    <CheckItem key={i} item={item} />
                  ))}
                </div>
              )}

              {/* Journal entries */}
              {data.journalEntries.length > 0 && (
                <div>
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '8px',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Plan Journal
                  </div>
                  {data.journalEntries.map((entry, i) => (
                    <JournalItem key={i} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MilestoneReader;
