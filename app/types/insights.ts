/**
 * Shape of the AI insights payload, declared separately from lib/ai.ts so
 * client components never import from a module that touches API keys — not
 * even for a type.
 */
export interface Insights {
  headline: string;
  cashFlow: string;
  risks: { customer: string; evidence: string }[];
  actions: string[];
}
