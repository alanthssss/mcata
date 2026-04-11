import { GameState, Direction } from '../core/types';

// ─── Agent action ─────────────────────────────────────────────────────────────
export type AgentAction = Direction;

// ─── Candidate move with score ────────────────────────────────────────────────
export interface CandidateMove {
  action: AgentAction;
  score: number;
  description?: string;
}

// ─── Agent decision ───────────────────────────────────────────────────────────
export interface AgentDecision {
  action: AgentAction;
  candidates?: CandidateMove[];
  explanation?: string;
}

// ─── Agent evaluation (optional, for explain()) ───────────────────────────────
export interface AgentEvaluation {
  topCandidates: CandidateMove[];
  chosen: AgentAction;
  reasoning: string;
}

// ─── Agent context ────────────────────────────────────────────────────────────
export interface AgentContext {
  state: GameState;
  /** Available actions (pre-filtered legal moves). If empty, agent must determine them. */
  legalActions?: AgentAction[];
}

// ─── Core agent interface ─────────────────────────────────────────────────────
export interface Agent {
  readonly name: string;
  readonly config: Record<string, unknown>;

  /** Return the next action to play given the current state. */
  nextAction(state: GameState): AgentAction;

  /** Optionally explain the chosen action (top candidates + reasoning). */
  explain?(state: GameState): AgentEvaluation;
}

// ─── RL-ready policy interfaces (future integration) ─────────────────────────

/** Abstract policy that maps a state to action probabilities. */
export interface Policy {
  readonly name: string;
  /** Returns a probability distribution over directions. */
  actionProbabilities(state: GameState): Record<AgentAction, number>;
  /** Selects an action (may sample from distribution). */
  selectAction(state: GameState): AgentAction;
}

/** Placeholder for a DQN (Deep Q-Network) policy. */
export interface DQNPolicy extends Policy {
  readonly kind: 'dqn';
  /** Load weights from a serialised checkpoint. */
  loadWeights(checkpoint: unknown): void;
}

/** Placeholder for a PPO (Proximal Policy Optimisation) policy. */
export interface PPOPolicy extends Policy {
  readonly kind: 'ppo';
  loadWeights(checkpoint: unknown): void;
}

/** Adapter that wraps a Policy into the Agent interface. */
export class PolicyAgent implements Agent {
  readonly name: string;
  readonly config: Record<string, unknown>;

  constructor(private readonly policy: Policy) {
    this.name = `PolicyAgent(${policy.name})`;
    this.config = { policy: policy.name };
  }

  nextAction(state: GameState): AgentAction {
    return this.policy.selectAction(state);
  }
}
