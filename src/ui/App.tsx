import React, { useEffect, useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useProfileStore } from '../store/profileStore';
import { Direction } from '../core/types';
import { GridView } from './components/GridView';
import { Header } from './components/Header';
import { PhasePanel } from './components/PhasePanel';
import { CatalystPanel } from './components/CatalystPanel';
import { ControlPad } from './components/ControlPad';
import { OutputPanel } from './components/OutputPanel';
import { LogPanel } from './components/LogPanel';
import { ForgeModal } from './components/ForgeModal';
import { InfusionModal } from './components/InfusionModal';
import { StartScreen } from './components/StartScreen';
import { EndScreen } from './components/EndScreen';
import { RoundCompleteScreen } from './components/RoundCompleteScreen';
import { ChallengeSelectScreen } from './components/ChallengeSelectScreen';
import { MilestoneNotification, JackpotBanner } from './components/MilestoneNotification';
import { SignalPanel } from './components/SignalPanel';
import { ProtocolPanel } from './components/ProtocolBadge';
import { MomentumBar } from './components/MomentumBar';
import { SynergyPanel } from './components/SynergyPanel';
import { PatternPanel } from './components/PatternPanel';
import { CatalystCollectionView } from './components/CatalystCollectionView';
import { useT } from '../i18n';
import './style.css';

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

const SIGNAL_IDS = new Set(['pulse_boost', 'grid_clean', 'chain_trigger', 'freeze_step']);
const PATTERN_IDS = new Set(['corner', 'chain', 'empty_space', 'high_tier', 'economy', 'survival']);

export const App: React.FC = () => {
  const state = useGameStore();
  const { profile } = useProfileStore();
  const t = useT();
  const [showCollection, setShowCollection] = useState(false);

  const handleMove = useCallback((dir: Direction) => {
    state.move(dir);
  }, [state.move]);

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

  if (state.screen === 'start') {
    return <StartScreen
      onStart={(protocol) => state.initAndStart(undefined, protocol)}
      onChallenge={() => state.showChallengeSelect()}
      onDailyRun={() => state.startDailyRun()}
    />;
  }

  if (state.screen === 'challenge_select') {
    return (
      <ChallengeSelectScreen
        onSelect={(challengeId) => state.startChallenge(challengeId)}
        onBack={() => state.initGame()}
      />
    );
  }

  if (state.screen === 'round_complete') {
    return (
      <RoundCompleteScreen
        roundNumber={state.roundNumber}
        roundOutput={state.roundOutput}
        totalOutput={state.totalOutput}
        bestMoveOutput={state.bestMoveOutput}
        activeCatalysts={state.activeCatalysts}
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
        onRestart={() => state.initGame()}
      />
    );
  }

  const lastEntry = state.reactionLog[0] ?? null;
  const lastTriggeredSynergies = lastEntry?.triggeredSynergies ?? [];
  const signalToast = lastEntry?.signalUsed
    ? `${t(`signal.${lastEntry.signalUsed}.name`)} → ${lastEntry.signalEffect ? renderLocalized(lastEntry.signalEffect.key, lastEntry.signalEffect.params) : t('ui.signal_consumed')}`
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
          <ProtocolPanel protocol={state.protocol} />
          <MomentumBar
            momentumMultiplier={state.momentumMultiplier}
            consecutiveValidMoves={state.consecutiveValidMoves}
          />
          <CatalystPanel activeCatalysts={state.activeCatalysts} frozenCell={state.frozenCell} />
          <SynergyPanel
            activeCatalysts={state.activeCatalysts}
            lastTriggeredSynergies={lastTriggeredSynergies}
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
          <OutputPanel lastEntry={lastEntry} />
        </div>

        <div className="center-column">
          <GridView
            grid={state.grid}
            frozenCell={state.activeCatalysts.includes('frozen_cell') ? state.frozenCell : null}
            blockedCell={state.entropyBlockedCell}
          />
          <ControlPad onMove={handleMove} />
        </div>

        <div className="right-column">
          <div className="right-column-top">
            <button
              className="collection-btn"
              onClick={() => setShowCollection(true)}
              aria-label={t('ui.open_collection')}
            >
              {t('ui.open_collection')}
            </button>
          </div>
          <LogPanel log={state.reactionLog} />
        </div>
      </div>

      {state.screen === 'forge' && (
          <ForgeModal
          offers={state.forgeOffers}
          activeCatalysts={state.activeCatalysts}
          energy={state.energy}
          lastIntermissionMessage={state.lastIntermissionMessage}
          onBuy={state.purchaseCatalyst}
          onSell={state.sellCatalystAt}
          onReroll={state.reroll}
          onSkip={state.skipForgePhase}
          />
      )}

      {state.screen === 'infusion' && (
        <InfusionModal
          options={state.infusionOptions}
          onChoose={state.chooseInfusion}
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
    </div>
  );
};
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
