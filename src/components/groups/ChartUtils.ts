import { format, parseISO } from "date-fns";
import { ViewerData, ChartData } from "./types";

export const filterDataByTimeRange = (data: ViewerData[], timeRange: number) => {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - timeRange * 60 * 60 * 1000);
  return data.filter(item => new Date(item.timestamp) > cutoffTime);
};

export const aggregateChartData = (data: ViewerData[]) => {
  const aggregatedByMinute: Record<string, ChartData> = {};

  data.forEach((item) => {
    const minute = format(parseISO(item.timestamp), "yyyy-MM-dd HH:mm:00");
    
    if (!aggregatedByMinute[minute]) {
      aggregatedByMinute[minute] = {
        timestamp: minute,
        totalViewers: 0,
        channels: {},
      };
    }
    
    aggregatedByMinute[minute].channels[item.channelName] = item.viewers;
    aggregatedByMinute[minute].totalViewers = Object.values(aggregatedByMinute[minute].channels)
      .reduce((a, b) => a + b, 0);
  });

  return Object.values(aggregatedByMinute).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};