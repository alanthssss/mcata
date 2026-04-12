import { Agent, AgentAction, AgentEvaluation, CandidateMove } from '../types';
import { GameState } from '../../core/types';
import { createRng } from '../../core/rng';
import { legalMoves } from '../policy/scoring';

export class RandomAgent implements Agent {
  readonly name = 'RandomAgent';
  readonly config: Record<string, unknown> = {};

  private seed: number;

  constructor(seed = 42) {
    this.seed = seed;
  }

  nextAction(state: GameState): AgentAction {
    const moves = legalMoves(state);
    if (moves.length === 0) return 'up'; // fallback
    const rng = createRng(this.seed + state.reactionLog.length);
    this.seed++;
    return rng.pick(moves);
  }

  explain(state: GameState): AgentEvaluation {
    const moves = legalMoves(state);
    const candidates: CandidateMove[] = moves.map(m => ({ action: m, score: 1 / moves.length }));
    const chosen = this.nextAction(state);
    return {
      topCandidates: candidates,
      chosen,
      reasoning: 'Uniform random selection among legal moves.',
    };
  }
}
