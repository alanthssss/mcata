import React, { useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
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
import './style.css';

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

export const App: React.FC = () => {
  const state = useGameStore();

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
    return <StartScreen onStart={state.start} />;
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

  return (
    <div className="app">
      <Header
        phaseIndex={state.phaseIndex}
        output={state.output}
        totalOutput={state.totalOutput}
        stepsRemaining={state.stepsRemaining}
        energy={state.energy}
        globalMultiplier={state.globalMultiplier}
      />

      <div className="game-layout">
        <div className="left-column">
          <PhasePanel phaseIndex={state.phaseIndex} output={state.output} />
          <CatalystPanel activeCatalysts={state.activeCatalysts} frozenCell={state.frozenCell} />
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
    </div>
  );
};

