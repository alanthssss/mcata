import { Agent, AgentAction, AgentEvaluation, CandidateMove } from '../types';
import { GameState } from '../../core/types';
import { processMoveAction } from '../../core/engine';
import { legalMoves } from '../policy/scoring';
import { evaluateState, EvalWeights, DEFAULT_WEIGHTS } from '../policy/evaluation';

export interface BeamSearchConfig {
  depth?:     number;  // search depth (default 3)
  beamWidth?: number;  // beam width / top-K (default 3)
  weights?:   Partial<EvalWeights>;
}

interface Beam {
  state:     GameState;
  firstMove: AgentAction;
  score:     number;
}

export class BeamSearchAgent implements Agent {
  readonly name = 'BeamSearchAgent';
  readonly config: Record<string, unknown>;
  private depth:     number;
  private beamWidth: number;
  private weights:   EvalWeights;

  constructor(cfg: BeamSearchConfig = {}) {
    this.depth     = cfg.depth     ?? 3;
    this.beamWidth = cfg.beamWidth ?? 3;
    this.weights   = { ...DEFAULT_WEIGHTS, ...cfg.weights };
    this.config    = { depth: this.depth, beamWidth: this.beamWidth };
  }

  nextAction(state: GameState): AgentAction {
    const moves = legalMoves(state);
    if (moves.length === 0) return 'up';

    // Initialise beam from root
    let beam: Beam[] = [];
    for (const dir of moves) {
      const next = processMoveAction(state, dir);
      if (next === state) continue;
      beam.push({ state: next, firstMove: dir, score: evaluateState(next, this.weights) });
    }

    for (let d = 1; d < this.depth; d++) {
      const expanded: Beam[] = [];
      for (const node of beam) {
        if (node.state.screen !== 'playing') {
          expanded.push(node);
          continue;
        }
        const childMoves = legalMoves(node.state);
        if (childMoves.length === 0) {
          expanded.push(node);
          continue;
        }
        for (const dir of childMoves) {
          const next = processMoveAction(node.state, dir);
          if (next === node.state) continue;
          expanded.push({
            state: next,
            firstMove: node.firstMove,
            score: evaluateState(next, this.weights),
          });
        }
      }
      // Prune to top-K
      beam = expanded
        .sort((a, b) => b.score - a.score)
        .slice(0, this.beamWidth);
    }

    if (beam.length === 0) return moves[0];
    return beam.sort((a, b) => b.score - a.score)[0].firstMove;
  }

  explain(state: GameState): AgentEvaluation {
    const moves = legalMoves(state);
    const candidates: CandidateMove[] = moves.map(dir => {
      const next = processMoveAction(state, dir);
      const score = next !== state ? evaluateState(next, this.weights) : -Infinity;
      return { action: dir, score };
    }).sort((a, b) => b.score - a.score);

    return {
      topCandidates: candidates.slice(0, 4),
      chosen: this.nextAction(state),
      reasoning: `BeamSearch depth=${this.depth} width=${this.beamWidth}`,
    };
  }
}
