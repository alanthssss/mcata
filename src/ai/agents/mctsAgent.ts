import { Agent, AgentAction, AgentEvaluation, CandidateMove } from '../types';
import { GameState } from '../../core/types';
import { processMoveAction } from '../../core/engine';
import { legalMoves } from '../policy/scoring';
import { evaluateState } from '../policy/evaluation';
import { createRng } from '../../core/rng';

export interface MCTSConfig {
  rollouts?:     number;  // simulations per root action (default 20)
  rolloutDepth?: number;  // max steps per rollout (default 10)
  seed?:         number;
}

interface ActionStat {
  visits: number;
  totalValue: number;
}

export class MCTSAgent implements Agent {
  readonly name = 'MCTSAgent';
  readonly config: Record<string, unknown>;
  private rollouts:     number;
  private rolloutDepth: number;
  private seed:         number;

  constructor(cfg: MCTSConfig = {}) {
    this.rollouts     = cfg.rollouts     ?? 20;
    this.rolloutDepth = cfg.rolloutDepth ?? 10;
    this.seed         = cfg.seed         ?? 0;
    this.config       = { rollouts: this.rollouts, rolloutDepth: this.rolloutDepth };
  }

  nextAction(state: GameState): AgentAction {
    const moves = legalMoves(state);
    if (moves.length === 0) return 'up';

    const stats: Record<string, ActionStat> = {};
    for (const m of moves) stats[m] = { visits: 0, totalValue: 0 };

    let rngSeed = this.seed + state.reactionLog.length * 7;

    for (let i = 0; i < this.rollouts; i++) {
      for (const dir of moves) {
        const afterMove = processMoveAction(state, dir);
        if (afterMove === state) continue;

        const value = this.rollout(afterMove, rngSeed++);
        stats[dir].visits++;
        stats[dir].totalValue += value;
      }
    }

    // Pick action by highest mean value
    let best: AgentAction = moves[0];
    let bestMean = -Infinity;
    for (const dir of moves) {
      const s = stats[dir];
      if (s.visits === 0) continue;
      const mean = s.totalValue / s.visits;
      if (mean > bestMean) { bestMean = mean; best = dir; }
    }
    this.seed++;
    return best;
  }

  private rollout(state: GameState, seed: number): number {
    const rng = createRng(seed);
    let s = state;
    for (let step = 0; step < this.rolloutDepth; step++) {
      if (s.screen !== 'playing') break;
      const moves = legalMoves(s);
      if (moves.length === 0) break;
      const dir = rng.pick(moves);
      s = processMoveAction(s, dir);
    }
    return evaluateState(s);
  }

  explain(state: GameState): AgentEvaluation {
    const moves = legalMoves(state);
    const candidates: CandidateMove[] = moves.map(dir => {
      const next = processMoveAction(state, dir);
      const score = next !== state ? evaluateState(next) : -Infinity;
      return { action: dir, score };
    }).sort((a, b) => b.score - a.score);

    return {
      topCandidates: candidates.slice(0, 4),
      chosen: this.nextAction(state),
      reasoning: `MCTS rollouts=${this.rollouts} depth=${this.rolloutDepth}`,
    };
  }
}
