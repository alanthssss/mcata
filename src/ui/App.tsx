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
import { SignalPanel } from './components/SignalPanel';
import { ProtocolPanel } from './components/ProtocolBadge';
import { MomentumBar } from './components/MomentumBar';
import { SynergyPanel } from './components/SynergyPanel';
import { CatalystCollectionView } from './components/CatalystCollectionView';
import { useT } from '../i18n';
import './style.css';

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

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
    return <StartScreen onStart={(protocol) => state.initAndStart(undefined, protocol)} />;
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
      />

      <div className="game-layout">
        <div className="left-column">
          <PhasePanel phaseIndex={state.phaseIndex} output={state.output} />
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
          onBuy={state.purchaseCatalyst}
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
    </div>
  );
};

