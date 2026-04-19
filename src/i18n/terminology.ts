import { Locale } from './types';

export const TERMINOLOGY_MAPPING_PLAN = [
  { oldName: 'Catalyst', newName: 'Boost', meaning: 'Passive modifier item', confusion: 'Theme-heavy chemistry term', risk: 'May feel less unique' },
  { oldName: 'Signal', newName: 'Skill', meaning: 'One-time tactical action', confusion: 'Reads like UI telemetry', risk: 'Could imply reusable ability' },
  { oldName: 'Pattern', newName: 'Style', meaning: 'Run-wide build path', confusion: 'Vague and abstract', risk: 'May sound cosmetic' },
  { oldName: 'Protocol', newName: 'Rule', meaning: 'Run-start ruleset', confusion: 'Technical/system wording', risk: 'Less premium flavor' },
  { oldName: 'Synergy', newName: 'Combo', meaning: 'Pair bonus', confusion: 'Abstract design jargon', risk: 'Slightly less strategic tone' },
  { oldName: 'Momentum', newName: 'Streak', meaning: 'Consecutive-score multiplier', confusion: 'Math/physics wording', risk: 'Overlaps with existing streak stat' },
  { oldName: 'Forge', newName: 'Shop', meaning: 'Buy screen', confusion: 'Thematic label hides function', risk: 'Less thematic identity' },
  { oldName: 'Infusion', newName: 'Pick', meaning: 'Post-clear reward choice', confusion: 'Not self-explanatory', risk: 'Loses flavor nuance' },
  { oldName: 'Phase', newName: 'Stage', meaning: 'Single gameplay segment', confusion: 'Abstract progression term', risk: 'May feel generic' },
  { oldName: 'Round', newName: 'Level', meaning: 'Group of 6 stages', confusion: 'Competes with turn/step terms', risk: 'Can imply finite campaign level' },
  { oldName: 'Anomaly', newName: 'Hazard', meaning: 'Special challenge modifier', confusion: 'Sci-fi flavor over function', risk: 'Feels harsher in tone' },
] as const;

type ReplacementRule = readonly [RegExp, string];

const REPLACEMENTS_EN: ReplacementRule[] = [
  [/\bCatalysts\b/g, 'Boosts'],
  [/\bcatalysts\b/g, 'boosts'],
  [/\bCatalyst\b/g, 'Boost'],
  [/\bcatalyst\b/g, 'boost'],
  [/\bSignals\b/g, 'Skills'],
  [/\bsignals\b/g, 'skills'],
  [/\bSignal\b/g, 'Skill'],
  [/\bsignal\b/g, 'skill'],
  [/\bPatterns\b/g, 'Styles'],
  [/\bpatterns\b/g, 'styles'],
  [/\bPattern\b/g, 'Style'],
  [/\bpattern\b/g, 'style'],
  [/\bProtocols\b/g, 'Rules'],
  [/\bprotocols\b/g, 'rules'],
  [/\bProtocol\b/g, 'Rule'],
  [/\bprotocol\b/g, 'rule'],
  [/\bSynergies\b/g, 'Combos'],
  [/\bsynergies\b/g, 'combos'],
  [/\bSynergy\b/g, 'Combo'],
  [/\bsynergy\b/g, 'combo'],
  [/\bMomentum\b/g, 'Streak'],
  [/\bmomentum\b/g, 'streak'],
  [/\bForge\b/g, 'Shop'],
  [/\bforge\b/g, 'shop'],
  [/\bInfusion\b/g, 'Pick'],
  [/\binfusion\b/g, 'pick'],
  [/\bPhases\b/g, 'Stages'],
  [/\bphases\b/g, 'stages'],
  [/\bPhase\b/g, 'Stage'],
  [/\bphase\b/g, 'stage'],
  [/\bRounds\b/g, 'Levels'],
  [/\brounds\b/g, 'levels'],
  [/\bRound\b/g, 'Level'],
  [/\bround\b/g, 'level'],
  [/\bAnomalies\b/g, 'Hazards'],
  [/\banomalies\b/g, 'hazards'],
  [/\bAnomaly\b/g, 'Hazard'],
  [/\banomaly\b/g, 'hazard'],
];

const REPLACEMENTS_ZH_CN: ReplacementRule[] = [
  [/催化器/g, '增益'],
  [/信号/g, '技能'],
  [/协议/g, '规则'],
  [/协同/g, '连携'],
  [/动量/g, '连击'],
  [/熔炉/g, '商店'],
  [/注入/g, '奖励'],
  [/阶段/g, '关卡'],
  [/轮次/g, '层级'],
  [/异常/g, '险情'],
];

const REPLACEMENTS: Record<Locale, ReplacementRule[]> = {
  en: REPLACEMENTS_EN,
  'zh-CN': REPLACEMENTS_ZH_CN,
};

export function applyTerminology(locale: Locale, text: string): string {
  return REPLACEMENTS[locale].reduce((next, [pattern, replacement]) => {
    return next.replace(pattern, replacement);
  }, text);
}
