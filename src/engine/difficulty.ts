export interface DifficultyLevel {
  label: string;
  skillLevel: number;
  nodesLimit: number;
  movetimeMs: number;
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { label: "10級", skillLevel: 0, nodesLimit: 3_000, movetimeMs: 800 },
  { label: "8級", skillLevel: 4, nodesLimit: 8_000, movetimeMs: 800 },
  { label: "6級", skillLevel: 8, nodesLimit: 20_000, movetimeMs: 1_000 },
  { label: "4級", skillLevel: 12, nodesLimit: 60_000, movetimeMs: 1_200 },
  {
    label: "2級",
    skillLevel: 16,
    nodesLimit: 200_000,
    movetimeMs: 1_500,
  },
  { label: "初段", skillLevel: 20, nodesLimit: 0, movetimeMs: 2_000 },
  { label: "三段", skillLevel: 20, nodesLimit: 0, movetimeMs: 4_000 },
  { label: "五段", skillLevel: 20, nodesLimit: 0, movetimeMs: 8_000 },
];

export const DEFAULT_DIFFICULTY_ID = 3;

export function difficultyLevelById(id: number): DifficultyLevel {
  return DIFFICULTY_LEVELS[id] ?? DIFFICULTY_LEVELS[DEFAULT_DIFFICULTY_ID];
}
