export interface ChartData {
  timestamp: string;
  totalViewers: number;
  channels: Record<string, number>;
}

export interface ViewerData {
  timestamp: string;
  viewers: number;
  channelName: string;
}