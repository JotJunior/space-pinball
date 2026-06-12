/**
 * Mission and rank definitions for Space Cadet Pinball.
 * 9 ranks with progressive difficulty (calibrate objectives in task 7.5.4).
 */

export type MissionId =
  | 'recruit'
  | 'specialist'
  | 'trooper'
  | 'sergeant'
  | 'lieutenant'
  | 'captain'
  | 'commodore'
  | 'admiral'
  | 'science-officer';

export interface MissionObjective {
  type: 'hit-bumpers' | 'hit-targets' | 'score-points' | 'activate-flags' | 'hit-slings';
  count: number;
  description: string;
}

export interface MissionConfig {
  id: MissionId;
  rank: number;          // 1-9
  name: string;
  objectives: MissionObjective[];
  scoreBonus: number;    // awarded on mission complete
  fuelLightsRequired: number; // how many fuel lights must be lit to activate
}

export const MISSIONS: MissionConfig[] = [
  {
    id: 'recruit',
    rank: 1,
    name: 'Cadet',
    objectives: [
      { type: 'hit-bumpers', count: 5,  description: 'Hit bumpers 5 times' },
    ],
    scoreBonus: 15000,
    fuelLightsRequired: 1,
  },
  {
    id: 'specialist',
    rank: 2,
    name: 'Specialist',
    objectives: [
      { type: 'hit-bumpers', count: 10, description: 'Hit bumpers 10 times' },
      { type: 'hit-targets', count: 3,  description: 'Hit all ATF targets' },
    ],
    scoreBonus: 30000,
    fuelLightsRequired: 2,
  },
  {
    id: 'trooper',
    rank: 3,
    name: 'Trooper',
    objectives: [
      { type: 'hit-slings',  count: 5,  description: 'Activate slingshots 5 times' },
      { type: 'hit-bumpers', count: 15, description: 'Hit bumpers 15 times' },
    ],
    scoreBonus: 50000,
    fuelLightsRequired: 3,
  },
  {
    id: 'sergeant',
    rank: 4,
    name: 'Sergeant',
    objectives: [
      { type: 'hit-bumpers', count: 25, description: 'Hit bumpers 25 times' },
      { type: 'hit-targets', count: 6,  description: 'Complete 2 ATF cycles' },
    ],
    scoreBonus: 75000,
    fuelLightsRequired: 4,
  },
  {
    id: 'lieutenant',
    rank: 5,
    name: 'Lieutenant',
    objectives: [
      { type: 'score-points',  count: 200000, description: 'Score 200,000 points' },
      { type: 'hit-bumpers',   count: 40,     description: 'Hit bumpers 40 times' },
    ],
    scoreBonus: 100000,
    fuelLightsRequired: 5,
  },
  {
    id: 'captain',
    rank: 6,
    name: 'Captain',
    objectives: [
      { type: 'score-points', count: 400000, description: 'Score 400,000 points' },
      { type: 'hit-targets',  count: 12,     description: 'Complete 4 ATF cycles' },
      { type: 'hit-slings',   count: 15,     description: 'Activate slingshots 15 times' },
    ],
    scoreBonus: 150000,
    fuelLightsRequired: 5,
  },
  {
    id: 'commodore',
    rank: 7,
    name: 'Commodore',
    objectives: [
      { type: 'score-points', count: 600000, description: 'Score 600,000 points' },
      { type: 'hit-bumpers',  count: 75,     description: 'Hit bumpers 75 times' },
    ],
    scoreBonus: 200000,
    fuelLightsRequired: 5,
  },
  {
    id: 'admiral',
    rank: 8,
    name: 'Admiral',
    objectives: [
      { type: 'score-points', count: 1000000, description: 'Score 1,000,000 points' },
      { type: 'hit-bumpers',  count: 100,     description: 'Hit bumpers 100 times' },
      { type: 'hit-targets',  count: 24,      description: 'Complete 8 ATF cycles' },
    ],
    scoreBonus: 500000,
    fuelLightsRequired: 5,
  },
  {
    id: 'science-officer',
    rank: 9,
    name: 'Science Officer',
    objectives: [
      { type: 'score-points', count: 2000000, description: 'Score 2,000,000 points' },
    ],
    scoreBonus: 1000000,
    fuelLightsRequired: 5,
  },
];
