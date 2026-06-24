export interface WalkStep {
  road: string;
  distance: number;
  action: string;
}

export interface TimetableStop {
  name: string;
  isDeparture: boolean;
  isArrival: boolean;
}

export interface TransitStep {
  instruction: string;
  type: 'walk' | 'bus' | 'subway' | 'transfer';
  lineName?: string;
  lineColor?: string;
  stationCount?: number;
  duration?: number;
  distance?: number;
  from?: string;
  to?: string;
  walkSteps?: WalkStep[];
  viaStops?: string[];
  lineType?: string;
  startTime?: string;
  endTime?: string;
  stopList?: TimetableStop[];
}

export interface TransitPlan {
  id: string;
  totalDuration: number;
  totalDistance: number;
  walkDistance: number;
  cost: number;
  transferCount: number;
  tags: string[];
  steps: TransitStep[];
  isRecommended?: boolean;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  name: string;
  updatedAt: number;
}

export interface SearchParams {
  origin: string;
  destination: string;
  city: string;
}