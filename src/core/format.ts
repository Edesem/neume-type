import type { Results } from './session';

export interface FormattedResults {
  time: string;
  rate: string;
  accuracy: string;
}

/** Fixed-decimal strings for display: 2 for time, 1 for rate and accuracy. */
export function formatResults(results: Results): FormattedResults {
  return {
    time: results.totalSeconds.toFixed(2),
    rate: results.neumesPerMinute === null ? '—' : results.neumesPerMinute.toFixed(1),
    accuracy: `${results.accuracyPercent.toFixed(1)}%`,
  };
}
