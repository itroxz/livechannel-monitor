export type TimeRange = "30min" | "1h" | "5h" | "1d" | "custom";

export interface Channel {
  id: string;
  channel_name: string;
  group_id: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface Metric {
  channel_id: string;
  viewers_count: number;
  is_live: boolean;
  timestamp: string;
  peak_viewers_count: number;
}