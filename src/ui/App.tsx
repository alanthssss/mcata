import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useProfileStore } from '../store/profileStore';
import { Direction } from '../core/types';
import { GridView } from './components/GridView';
import { Header } from './components/Header';
import { PhasePanel } from './components/PhasePanel';
import { CatalystPanel } from './components/CatalystPanel';
import { OutputPanel } from './components/OutputPanel';
import { LogPanel } from './components/LogPanel';
import { ForgeModal } from './components/ForgeModal';
import { StartScreen } from './components/StartScreen';
import { EndScreen } from './components/EndScreen';
import { RoundCompleteScreen } from './components/RoundCompleteScreen';
import { MilestoneNotification, JackpotBanner } from './components/MilestoneNotification';
import { SignalPanel } from './components/SignalPanel';
import { ProtocolPanel } from './components/ProtocolBadge';
import { MomentumBar } from './components/MomentumBar';
import { SynergyPanel } from './components/SynergyPanel';
import { PatternPanel } from './components/PatternPanel';
import { CatalystCollectionView } from './components/CatalystCollectionView';
import { BuildIdentityPanel } from './components/BuildIdentityPanel';
import { EntropyBar } from './components/EntropyBar';
import { useT } from '../i18n';
import { ENABLE_SECONDARY_MODES } from '../core/features';
import { INFINITE_MODE_CONFIG } from '../core/config';
import './style.css';

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

const SIGNAL_IDS = new Set(['pulse_boost', 'grid_clean', 'chain_trigger', 'freeze_step']);
const PATTERN_IDS = new Set(['corner', 'chain', 'empty_space', 'high_tier', 'economy', 'survival']);
const ONBOARDING_ADVANCED_SYSTEM_MOVE_THRESHOLD = 3;

function findMergeHintPair(grid: import('../core/types').Grid): [import('../core/types').Position, import('../core/types').Position] | null {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      const right = grid[r][c + 1];
      if (right && right.value === cell.value) {
        return [{ row: r, col: c }, { row: r, col: c + 1 }];
      }
      const down = grid[r + 1]?.[c];
      if (down && down.value === cell.value) {
        return [{ row: r, col: c }, { row: r + 1, col: c }];
      }
    }
  }
  return null;
}

function getMergeFeedbackLevel(mergeMoves: number, hasMergeInLastEntry: boolean): 'normal' | 'strong' | null {
  if (!hasMergeInLastEntry) return null;
  if (mergeMoves === 1) return 'strong';
  if (mergeMoves === 2) return 'normal';
  return null;
}

export const App: React.FC = () => {
  const state = useGameStore();
  const { profile } = useProfileStore();
  const t = useT();
  const [showCollection, setShowCollection] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const renderLocalized = useCallback((key: string, params?: Record<string, string | number>) => {
    if (!params) return t(key);
    const resolved = { ...params };
    if (typeof resolved.name === 'string') {
      const id = resolved.name;
      if (SIGNAL_IDS.has(id)) resolved.name = t(`signal.${id}.name`);
      else if (PATTERN_IDS.has(id)) resolved.name = t(`pattern.${id}.name`);
      else resolved.name = t(`catalyst.${id}.name`);
    }
    return t(key, resolved);
  }, [t]);

  const handleMove = useCallback((dir: Direction) => {
    state.move(dir);
  }, [state.move]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart || state.screen !== 'playing') return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const threshold = 26;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  }, [handleMove, state.screen, touchStart]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (dir && state.screen === 'playing') {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMove, state.screen]);

  useEffect(() => {
    if (ENABLE_SECONDARY_MODES) return;
    if (state.challengeId || state.isDailyRun || state.screen === 'challenge_select') {
      state.initGame(undefined, state.protocol);
    }
  }, [state.challengeId, state.initGame, state.isDailyRun, state.protocol, state.screen]);

  // Must be computed before any conditional returns to satisfy Rules of Hooks.
  const mergeMoves = useMemo(() => state.reactionLog.reduce((count, entry) => (
    entry.merges.length > 0 ? count + 1 : count
  ), 0), [state.reactionLog]);

  if (state.screen === 'start' || (!ENABLE_SECONDARY_MODES && state.screen === 'challenge_select')) {
    return <StartScreen
      onStart={(protocol, infiniteMode) => state.initAndStart(undefined, protocol, infiniteMode)}
    />;
  }

  if (state.screen === 'round_complete') {
    return (
        <RoundCompleteScreen
          roundNumber={state.roundNumber}
          roundOutput={state.roundOutput}
          totalOutput={state.totalOutput}
          bestMoveOutput={state.bestMoveOutput}
          activeCatalysts={state.activeCatalysts}
          activePattern={state.activePattern}
          reactionLog={state.reactionLog}
          energy={state.energy}
          onContinue={() => state.nextRound()}
          onQuit={() => state.initGame()}
        />
    );
  }

  if (state.screen === 'run_complete') {
    return (
      <EndScreen
        isVictory={true}
        totalOutput={state.totalOutput}
        onRestart={() => state.initGame()}
      />
    );
  }

  if (state.screen === 'game_over') {
    return (
      <EndScreen
        isVictory={false}
        totalOutput={state.totalOutput}
        failReason={state.failReason}
        onRestart={() => state.initGame()}
      />
    );
  }

  const lastEntry = state.reactionLog[0] ?? null;
  const onboardingRun = state.roundNumber === 1 && state.phaseIndex === 0 && state.screen === 'playing';
  const advancedSystemsUnlocked = !onboardingRun || state.reactionLog.length >= ONBOARDING_ADVANCED_SYSTEM_MOVE_THRESHOLD;
  const hintPair = onboardingRun && mergeMoves === 0 ? findMergeHintPair(state.grid) : null;
  const mergeTargets = lastEntry?.merges.map(m => m.to) ?? [];
  const mergeFeedback = getMergeFeedbackLevel(mergeMoves, !!lastEntry?.merges.length);
  const showSmallSystemNudge = onboardingRun && !advancedSystemsUnlocked && mergeMoves > 0;
  const lastTriggeredSynergies = lastEntry?.triggeredSynergies ?? [];
  const signalToast = lastEntry?.signalUsed
    ? `${t(`signal.${lastEntry.signalUsed}.name`)} → ${lastEntry.signalEffect ? renderLocalized(lastEntry.signalEffect.key, lastEntry.signalEffect.params) : t('ui.signal_consumed')}`
    : null;
  const intermissionToast = state.lastIntermissionMessage
    ? renderLocalized(state.lastIntermissionMessage.key, state.lastIntermissionMessage.params)
    : null;

  return (
    <div className="app">
      <Header
        phaseIndex={state.phaseIndex}
        output={state.output}
        totalOutput={state.totalOutput}
        stepsRemaining={state.stepsRemaining}
        energy={state.energy}
        globalMultiplier={state.globalMultiplier}
        protocol={state.protocol}
        momentumMultiplier={state.momentumMultiplier}
        phaseTargetOutput={state.phaseTargetOutput}
      />

      <div className="game-layout">
        <div className="left-column">
          <PhasePanel phaseIndex={state.phaseIndex} output={state.output} phaseTargetOutput={state.phaseTargetOutput} />
          {state.infiniteModeEnabled && (
            <EntropyBar
              entropy={state.entropy}
              entropyMax={INFINITE_MODE_CONFIG.entropy.max}
              phaseObjectiveScore={INFINITE_MODE_CONFIG.phaseObjective.score}
              currentOutput={state.output}
            />
          )}
          <ProtocolPanel protocol={state.protocol} />
          {(advancedSystemsUnlocked || showSmallSystemNudge) && (
            <MomentumBar
              momentumMultiplier={state.momentumMultiplier}
              consecutiveValidMoves={state.consecutiveValidMoves}
            />
          )}
          {advancedSystemsUnlocked && (
            <>
              <CatalystPanel activeCatalysts={state.activeCatalysts} frozenCell={state.frozenCell} />
              <SynergyPanel
                activeCatalysts={state.activeCatalysts}
                lastTriggeredSynergies={lastTriggeredSynergies}
              />
              <BuildIdentityPanel
                activeCatalysts={state.activeCatalysts}
                activePattern={state.activePattern}
                reactionLog={state.reactionLog}
                energy={state.energy}
              />
              <SignalPanel
                signals={state.signals}
                pendingSignal={state.pendingSignal}
                onActivate={state.activateSignal}
              />
              <PatternPanel
                activePattern={state.activePattern}
                level={state.activePattern ? state.patternLevels[state.activePattern] : 0}
              />
            </>
          )}
        </div>

        <div className="center-column" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <GridView
            grid={state.grid}
            frozenCell={state.activeCatalysts.includes('frozen_cell') ? state.frozenCell : null}
            blockedCell={state.entropyBlockedCell}
            hintedPair={hintPair}
            mergeTargets={mergeTargets}
            mergeFeedback={mergeFeedback}
          />
        </div>

        <div className="right-column">
          {advancedSystemsUnlocked && (
            <>
              <div className="right-column-top">
                <button
                  className="collection-btn"
                  onClick={() => setShowCollection(true)}
                  aria-label={t('ui.open_collection')}
                >
                  {t('ui.open_collection')}
                </button>
              </div>
              <button className="panel-collapse-btn" onClick={() => setShowBreakdown(v => !v)}>
                {showBreakdown ? t('ui.collapse_breakdown') : t('ui.expand_breakdown')}
              </button>
              {showBreakdown && <OutputPanel lastEntry={lastEntry} />}
              <button className="panel-collapse-btn" onClick={() => setShowLog(v => !v)}>
                {showLog ? t('ui.collapse_log') : t('ui.expand_log')}
              </button>
              {showLog && <LogPanel log={state.reactionLog} />}
            </>
          )}
        </div>
      </div>

      {state.screen === 'forge' && (
        <ForgeModal
          items={state.forgeItems}
          activeCatalysts={state.activeCatalysts}
          activePattern={state.activePattern}
          activePatternLevel={state.activePattern ? state.patternLevels[state.activePattern] : 0}
          reactionLog={state.reactionLog}
          signals={state.signals}
          energy={state.energy}
          lastIntermissionMessage={state.lastIntermissionMessage}
          onBuy={state.purchaseForgeItem}
          onSell={state.sellCatalystAt}
          onSellPattern={state.sellPatternActive}
          onSellSignal={state.sellSignalById}
          onReroll={state.reroll}
          onSkip={state.skipForgePhase}
        />
      )}

      {showCollection && (
        <CatalystCollectionView
          unlockedIds={profile.unlockedCatalysts}
          onClose={() => setShowCollection(false)}
        />
      )}

      {state.pendingMilestones.length > 0 && (
        <MilestoneNotification
          milestoneId={state.pendingMilestones[0]}
          onDismiss={state.dismissMilestone}
        />
      )}
      {state.jackpotTriggered && (
        <JackpotBanner onDismiss={state.dismissJackpot} />
      )}
      {signalToast && (
        <div className="signal-pending">{signalToast}</div>
      )}
      {state.screen === 'playing' && intermissionToast && (
        <div className="signal-pending">{intermissionToast}</div>
      )}
    </div>
  );
};
