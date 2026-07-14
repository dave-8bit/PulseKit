export type AiQueryRequest = {
  question: string;
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  granularity?: "hour" | "day";
  topK?: number;
};

export type AiQueryResponseData<TMetrics = unknown> = {
  answer: string;
  metrics: TMetrics;
};

export type AiQueryResponse<TMetrics = unknown> = {
  success: true;
  data: AiQueryResponseData<TMetrics>;
};

