
export interface Participant {
  id: string;
  name: string;
  company: string;
  segment: string;
  employeeCount?: string;
  eventName?: string;
  isHost?: boolean;
}

export interface ConnectionMatch {
  participant1Id: string;
  participant2Id: string;
  score: number;
  reasoning: string;
}

export interface RecommendedConnection {
  partnerId: string;
  score: number;
  reason: string;
}

export interface IndividualScore {
  participantId: string;
  score: number;
  potentialConnections: number;
  scoreReasoning?: string;
  recommendedConnections?: RecommendedConnection[];
}

export type LayoutFormat = 'teatro' | 'sala_aula' | 'mesa_o' | 'conferencia' | 'mesa_u' | 'mesa_t' | 'recepcao' | 'buffet' | 'custom';

export interface AnalysisResult {
  overallScore: number;
  summary: string;
  averageEmployees: number; // Novo campo
  participants: Participant[];
  individualScores: IndividualScore[];
  topMatches: ConnectionMatch[];
  segmentDistribution: { name: string; value: number }[];
  suggestedLayout: LayoutFormat;
  seatingGroups: string[][];
}

export enum AppView {
  SELECTION = 'SELECTION',
  INPUT = 'INPUT',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
}

export type AppMode = 'GENERAL' | 'HOST';
