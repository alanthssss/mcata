import { Agent, AgentAction, AgentEvaluation, CandidateMove } from '../types';
import { GameState } from '../../core/types';
import { legalMoves, scoreImmediateMove } from '../policy/scoring';

export class GreedyAgent implements Agent {
  readonly name = 'GreedyAgent';
  readonly config: Record<string, unknown> = {};

  nextAction(state: GameState): AgentAction {
    const moves = legalMoves(state);
    if (moves.length === 0) return 'up';

    let best: AgentAction = moves[0];
    let bestScore = -Infinity;

    for (const dir of moves) {
      const score = scoreImmediateMove(state, dir);
      if (score && score.total > bestScore) {
        bestScore = score.total;
        best = dir;
      }
    }
    return best;
  }

  explain(state: GameState): AgentEvaluation {
    const moves = legalMoves(state);
    const candidates: CandidateMove[] = moves.map(dir => {
      const s = scoreImmediateMove(state, dir);
      return {
        action: dir,
        score: s?.total ?? -Infinity,
        description: s
          ? `output+${s.outputGained} empty:${s.emptyCells} corner:${s.cornerBonus.toFixed(1)}`
          : 'invalid',
      };
    }).sort((a, b) => b.score - a.score);

    const chosen = this.nextAction(state);
    return {
      topCandidates: candidates.slice(0, 4),
      chosen,
      reasoning: `Greedy pick: best immediate heuristic score = ${candidates[0]?.score.toFixed(1)}`,
    };
  }
}
