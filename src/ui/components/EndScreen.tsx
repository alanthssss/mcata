import React from 'react';

interface EndScreenProps {
  isVictory: boolean;
  totalOutput: number;
  onRestart: () => void;
}

export const EndScreen: React.FC<EndScreenProps> = ({ isVictory, totalOutput, onRestart }) => {
  return (
    <div className="screen end-screen">
      <h1 className={`end-title ${isVictory ? 'victory' : 'defeat'}`}>
        {isVictory ? '🏆 Run Complete!' : '💀 Run Failed'}
      </h1>
      <p className="end-subtitle">
        {isVictory
          ? 'You have neutralized all Anomalies. The reaction chain is stable.'
          : 'The reaction chain collapsed. Output insufficient.'}
      </p>
      <div className="end-stats">
        <div className="stat-block">
          <div className="stat-label">Total Output</div>
          <div className="stat-big">{totalOutput}</div>
        </div>
      </div>
      <button className="start-btn" onClick={onRestart}>New Run</button>
    </div>
  );
};
