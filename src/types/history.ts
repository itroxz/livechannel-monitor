export type TimeRange = "30min" | "1h" | "5h" | "1d" | "custom";

export interface Channel {
  id: string;
  channel_name: string;
  group_id: string;
  peak_viewers_count: number;
  peak_viewers_timestamp: string | null;
  platform: string;
  channel_id: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface Metric {
  id: string;
  channel_id: string;
  viewers_count: number;
  is_live: boolean;
  timestamp: string;
}