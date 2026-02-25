import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlanningDrawerContent } from '../../types/workspace';

interface ScratchpadProps {
  scratchpad: string;
  scratchpadVisible: boolean;
  workspaceId: string;
  dispatch: React.Dispatch<{ type: 'UPDATE_PLANNING'; planning: Partial<PlanningDrawerContent> }>;
}

function Scratchpad({ scratchpad, scratchpadVisible, workspaceId, dispatch }: ScratchpadProps) {
  const [localValue, setLocalValue] = useState(scratchpad);
  const localValueRef = useRef(scratchpad);
  const lastDispatchedRef = useRef(scratchpad);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when workspace switches
  useEffect(() => {
    setLocalValue(scratchpad);
    localValueRef.current = scratchpad;
    lastDispatchedRef.current = scratchpad;
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush pending changes on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (localValueRef.current !== lastDispatchedRef.current) {
        dispatch({ type: 'UPDATE_PLANNING', planning: { scratchpad: localValueRef.current } });
      }
    };
  }, [dispatch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalValue(value);
    localValueRef.current = value;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch({ type: 'UPDATE_PLANNING', planning: { scratchpad: value } });
      lastDispatchedRef.current = value;
    }, 500);
  }, [dispatch]);

  const toggleVisible = useCallback(() => {
    dispatch({ type: 'UPDATE_PLANNING', planning: { scratchpadVisible: !scratchpadVisible } });
  }, [dispatch, scratchpadVisible]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
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
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        <span style={{
          display: 'inline-block',
          transform: scratchpadVisible ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
          fontSize: '8px',
        }}>
          {'\u25B6'}
        </span>
        Scratchpad
      </button>

      {/* Textarea */}
      {scratchpadVisible && (
        <textarea
          value={localValue}
          onChange={handleChange}
          placeholder="Notes for this workspace..."
          spellCheck={false}
          style={{
            flex: 1,
            minHeight: '120px',
            padding: '8px 10px',
            background: 'var(--bg-base)',
            border: 'none',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            lineHeight: '1.5',
            resize: 'vertical',
            outline: 'none',
          }}
        />
      )}
    </div>
  );
}

export default Scratchpad;
