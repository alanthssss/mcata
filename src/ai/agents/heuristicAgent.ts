import { Agent, AgentAction, AgentEvaluation, CandidateMove } from '../types';
import { GameState } from '../../core/types';
import { processMoveAction } from '../../core/engine';
import { legalMoves } from '../policy/scoring';
import { evaluateState, EvalWeights, DEFAULT_WEIGHTS } from '../policy/evaluation';

export interface HeuristicAgentConfig {
  weights?: Partial<EvalWeights>;
}

export class HeuristicAgent implements Agent {
  readonly name = 'HeuristicAgent';
  readonly config: Record<string, unknown>;
  private readonly weights: EvalWeights;

  constructor(cfg: HeuristicAgentConfig = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...cfg.weights };
    this.config = { weights: this.weights };
  }

  nextAction(state: GameState): AgentAction {
    const moves = legalMoves(state);
    if (moves.length === 0) return 'up';

    let best: AgentAction = moves[0];
    let bestScore = -Infinity;

    for (const dir of moves) {
      const next = processMoveAction(state, dir);
      if (next === state) continue;
      const score = evaluateState(next, this.weights);
      if (score > bestScore) {
        bestScore = score;
        best = dir;
      }
    }
    return best;
  }

  explain(state: GameState): AgentEvaluation {
    const moves = legalMoves(state);
    const candidates: CandidateMove[] = moves.map(dir => {
      const next = processMoveAction(state, dir);
      const score = next !== state ? evaluateState(next, this.weights) : -Infinity;
      return { action: dir, score, description: score.toFixed(0) };
    }).sort((a, b) => b.score - a.score);

    return {
      topCandidates: candidates.slice(0, 4),
      chosen: this.nextAction(state),
      reasoning: `Heuristic eval: empty/mono/smooth/corner/merge/anomaly weights applied.`,
    };
  }
}
