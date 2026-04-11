import React from 'react';

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div className="screen start-screen">
      <h1 className="game-title">⚗ Merge Catalyst</h1>
      <p className="game-subtitle">A 2048-based Roguelike Puzzle Game</p>
      <div className="start-info">
        <p>🎯 Reach target Output before Steps run out</p>
        <p>⚗ Equip Catalysts to amplify your reactions</p>
        <p>⚡ Spend Energy at the Forge</p>
        <p>⚠ Survive Anomaly phases</p>
      </div>
      <div className="controls-info">
        <strong>Controls:</strong> Arrow Keys / WASD / On-screen buttons
      </div>
      <button className="start-btn" onClick={onStart}>Start Run</button>
    </div>
  );
};
