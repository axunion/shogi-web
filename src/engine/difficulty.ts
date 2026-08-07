export interface DifficultyLevel {
  label: string;
  skillLevel: number;
  nodesLimit: number;
  movetimeMs: number;
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { label: "入門", skillLevel: 0, nodesLimit: 3_000, movetimeMs: 800 },
  { label: "初級", skillLevel: 4, nodesLimit: 8_000, movetimeMs: 800 },
  { label: "初中級", skillLevel: 8, nodesLimit: 20_000, movetimeMs: 1_000 },
  { label: "中級", skillLevel: 12, nodesLimit: 60_000, movetimeMs: 1_200 },
  {
    label: "中上級",
    skillLevel: 16,
    nodesLimit: 200_000,
    movetimeMs: 1_500,
  },
  { label: "上級", skillLevel: 20, nodesLimit: 0, movetimeMs: 2_000 },
  { label: "強豪", skillLevel: 20, nodesLimit: 0, movetimeMs: 4_000 },
  { label: "最強", skillLevel: 20, nodesLimit: 0, movetimeMs: 8_000 },
];

export const DEFAULT_DIFFICULTY_ID = 3;

export function difficultyLevelById(id: number): DifficultyLevel {
  return DIFFICULTY_LEVELS[id] ?? DIFFICULTY_LEVELS[DEFAULT_DIFFICULTY_ID];
}
