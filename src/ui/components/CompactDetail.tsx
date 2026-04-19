import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface CompactDetailState {
  hovered: boolean;
  focused: boolean;
  pinned: boolean;
}

export type CompactDetailAction =
  | 'hover_enter'
  | 'hover_leave'
  | 'focus_enter'
  | 'focus_leave'
  | 'toggle_pin'
  | 'dismiss';

export const COMPACT_DETAIL_INITIAL_STATE: CompactDetailState = {
  hovered: false,
  focused: false,
  pinned: false,
};

export function reduceCompactDetailState(
  state: CompactDetailState,
  action: CompactDetailAction
): CompactDetailState {
  switch (action) {
    case 'hover_enter':
      return { ...state, hovered: true };
    case 'hover_leave':
      return { ...state, hovered: false };
    case 'focus_enter':
      return { ...state, focused: true };
    case 'focus_leave':
      return { ...state, focused: false };
    case 'toggle_pin':
      return { ...state, pinned: !state.pinned };
    case 'dismiss':
      return COMPACT_DETAIL_INITIAL_STATE;
    default:
      return state;
  }
}

interface CompactDetailProps {
  summary: React.ReactNode;
  detail: React.ReactNode;
  className?: string;
  selected?: boolean;
  onSummaryClick?: () => void;
}

export const CompactDetail: React.FC<CompactDetailProps> = ({
  summary,
  detail,
  className = '',
  selected = false,
  onSummaryClick,
}) => {
  const [state, setState] = useState<CompactDetailState>(COMPACT_DETAIL_INITIAL_STATE);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isOpen = state.hovered || state.focused || state.pinned;
  const popoverId = useMemo(() => `compact-detail-${Math.random().toString(36).slice(2, 10)}`, []);

  useEffect(() => {
    if (!state.pinned) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setState(prev => reduceCompactDetailState(prev, 'dismiss'));
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setState(prev => reduceCompactDetailState(prev, 'dismiss'));
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [state.pinned]);

  const handleSummaryClick = () => {
    setState(prev => reduceCompactDetailState(prev, 'toggle_pin'));
    onSummaryClick?.();
  };

  const handleSummaryKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSummaryClick();
    }
  };

  return (
    <div
      ref={rootRef}
      className={`compact-detail${selected ? ' compact-detail--selected' : ''}${className ? ` ${className}` : ''}`}
      onMouseEnter={() => setState(prev => reduceCompactDetailState(prev, 'hover_enter'))}
      onMouseLeave={() => setState(prev => reduceCompactDetailState(prev, 'hover_leave'))}
    >
      <button
        type="button"
        className="compact-detail__summary"
        onClick={handleSummaryClick}
        onKeyDown={handleSummaryKeyDown}
        onFocus={() => setState(prev => reduceCompactDetailState(prev, 'focus_enter'))}
        onBlur={() => setState(prev => reduceCompactDetailState(prev, 'focus_leave'))}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? popoverId : undefined}
      >
        {summary}
      </button>
      {isOpen && (
        <div id={popoverId} className="compact-detail__popover" role="tooltip">
          {detail}
        </div>
      )}
    </div>
  );
};
