
export interface WegMotorData {
  cv: number;
  kw: number;
  model: string;
  currentIn: number; // For 380V
  efficiency: number;
  powerFactor: number;
  frame: string;
  weight: number;
  rpm: number;
}

export interface MotorEntry {
  id: string;
  cvValue: string;
  customLabel: string;
}

export interface DimensioningResult {
  motor: WegMotorData;
  circuitBreaker: string;
  cableSize: string;
  contactor: string;
  protectionType: string;
  softStarter?: string;
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
