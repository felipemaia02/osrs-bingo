/** Every OSRS skill as Wise Old Man names it (feature 032), alphabetical in English. */
export const SKILLS = [
  'agility',
  'attack',
  'construction',
  'cooking',
  'crafting',
  'defence',
  'farming',
  'firemaking',
  'fishing',
  'fletching',
  'herblore',
  'hitpoints',
  'hunter',
  'magic',
  'mining',
  'prayer',
  'ranged',
  'runecrafting',
  'sailing',
  'slayer',
  'smithing',
  'strength',
  'thieving',
  'woodcutting',
] as const
export type Skill = (typeof SKILLS)[number]

export const MIN_SKILL_LEVEL = 1
export const MAX_SKILL_LEVEL = 99
