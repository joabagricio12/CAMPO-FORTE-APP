
export interface WegMotorData {
  cv: number;
  kw: number;
  model: string;
  currentIn: number;
  efficiency: number;
  powerFactor: number;
  frame: string;
  weight: number;
  rpm: number;
}

export interface DimensioningResult {
  motor: WegMotorData;
  circuitBreaker: string;
  cableSize: string;
  contactor: string;
  protectionType: string;
  softStarter?: string;
}

export interface BlockData {
  id: string;
  type: 'text' | 'motor';
  value: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface ProjectData {
  title: string;
  blocks: BlockData[];
}

export interface ProjectSummary {
  motorCount: number;
  motorList: { cv: number; count: number }[];
  totalCv: number;
  totalKw: number;
  totalIn: number;
  totalIp: number;
  recommendedMainBreaker: string;
  softStarterCount: number;
}
