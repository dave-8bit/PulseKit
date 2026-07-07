import type { InitConfig } from "./types";

let config: InitConfig | null = null;

export function init(next: InitConfig): void {
  config = next;
}

export function getConfig(): InitConfig {
  if (!config) {
    throw new Error("Tracker SDK: init() must be called before track().");
  }
  return config;
}

