import { sanitiseForAI, assertSafeForAI, firstNameOnly } from "./sanitise";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant"; // fast + free-tier friendly

export class AiError extends Error {}

/**
 * Every model call goes through here, and every payload goes through the
 * sanitiser first. `assertSafeForAI` throws rather than sending if anything
 * identifying survived — a loud failure beats a quiet leak.
 */
async function callGroq(
  prompt: string,
  systemPrompt: string,
  { maxTokens = 200, json = false }: { maxTokens?: number; json?: boolean } = {}
): Promise<string> {
  assertSafeForAI(prompt);

  if (!process.env.GROQ_API_KEY) {
    throw new AiError("The AI assistant is not configured — GROQ_API_KEY is missing.");
  }

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  } catch {
    throw new AiError("Could not reach the AI assistant. Check your connection.");
  }

  if (!res.ok) {
    const detail = await res.text();
    console.error("Groq error", res.status, detail.slice(0, 300));
    throw new AiError(
      res.status === 429
        ? "The AI assistant is rate limited right now. Try again in a moment."
        : "The AI assistant could not answer just now."
    );
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new AiError("The AI assistant returned an empty answer.");
  return text.trim();
}

// ---------------------------------------------------------------------------
// Follow-up messages
// ---------------------------------------------------------------------------

export type FollowUpType = "PAYMENT_REMINDER" | "DELIVERY_UPDATE" | "RESTOCK_NUDGE";

/**
 * Tone tracks how late the debt actually is. Two days is an oversight; three
 * weeks is a problem — and a trader who sends the same message for both either
 * annoys good customers or lets bad debt drift.
 */
function reminderTone(daysLate: number): string {
  if (daysLate <= 0) return "Friendly and light — the payment is not late yet, this is just a nudge.";
  if (daysLate <= 2) return "Warm and gentle — assume they simply forgot. No pressure at all.";
  if (daysLate <= 7) return "Polite but clearer — mention the date has passed and ask when they can pay.";
  if (daysLate <= 20)
    return "Firm and direct, still respectful — say it is well overdue and ask for a specific date.";
  return "Serious and final in tone, but never abusive or threatening — ask them to settle now and say you need to hear back today.";
}

export async function generateFollowUpMessage(params: {
  customerName: string;
  item: string;
  type: FollowUpType;
  daysLate?: number;
  outstanding?: number;
}): Promise<string> {
  // First name only, and the phone number never appears here — the WhatsApp
  // link is assembled on the client from data the model never sees.
  const name = firstNameOnly(params.customerName);
  const safe = sanitiseForAI({ name, item: params.item });
  const daysLate = params.daysLate ?? 0;
  const outstanding = params.outstanding ?? 0;

  const instructions: Record<FollowUpType, string> = {
    PAYMENT_REMINDER: `Write a WhatsApp message to ${name} asking for payment of ₦${outstanding.toLocaleString()} for "${(safe as any).item}".
${daysLate > 0 ? `The payment is ${daysLate} day${daysLate === 1 ? "" : "s"} overdue.` : "The payment is not overdue yet."}
Tone: ${reminderTone(daysLate)}`,

    DELIVERY_UPDATE: `Write a WhatsApp message to ${name} letting them know their "${(safe as any).item}" is on the way.
Tone: warm, brief, reassuring.`,

    RESTOCK_NUDGE: `Write a WhatsApp message to ${name} letting them know you have restocked "${(safe as any).item}" and inviting them to buy again.
Tone: warm and inviting, never pushy. This is a repeat customer you value.`,
  };

  return callGroq(
    instructions[params.type],
    `You write WhatsApp messages for a small trader in Nigeria.
Rules: plain warm Nigerian English, under 30 words, no emojis unless natural, no preamble,
no subject line, no sign-off placeholder like [Your Name]. Output only the message text.
Never threaten, shame, or mention police, court, or debt collectors.`,
    { maxTokens: 120 }
  );
}

// ---------------------------------------------------------------------------
// Prescriptive business insights
// ---------------------------------------------------------------------------

export interface InsightsInput {
  walletBalance: number | null;
  totalOutstanding: number;
  expectedThisWeek: number;
  overdue: { name: string; item: string; owed: number; daysLate: number }[];
  dueSoon: { name: string; item: string; owed: number; daysUntilDue: number }[];
  customers: {
    name: string;
    creditSales: number;
    timesPaidLate: number;
    timesOverdueNow: number;
    outstanding: number;
    worstDaysLate: number;
  }[];
  /**
   * Customers the deterministic rule in lib/credit.ts has already judged risky.
   * The model may only flag names from this list — it phrases the finding, it
   * does not decide it. Left to itself it invents "high risk of default" for
   * customers who have never taken credit.
   */
  riskyCustomers: string[];
  salesLast30Days: number;
  revenueCollected: number;
}

// Declared in app/types/insights.ts so client components can name the shape
// without importing this module.
export type { Insights } from "../app/types/insights";
import type { Insights } from "../app/types/insights";

/**
 * Judgements a trader can act on, not a description of their own data.
 * Returns structured JSON so the UI can rank actions rather than print a blob.
 */
export async function generateInsights(input: InsightsInput): Promise<Insights> {
  const safe = sanitiseForAI(input);
  assertSafeForAI(safe);

  const prompt = `A Nigerian market trader's business data:

${JSON.stringify(safe, null, 1)}

All money is in naira. "expectedThisWeek" is what customers owe that is either already
overdue or falls due within 7 days. "walletBalance" is cash they hold in BMONI right now.

Return JSON with exactly these keys:
{
  "headline": "one sentence, under 20 words, the single most important thing right now",
  "cashFlow": "one or two sentences comparing what is owed to them this week against their wallet balance, and what that means practically",
  "risks": [{"customer": "first name", "evidence": "the specific pattern, with numbers"}],
  "actions": ["ranked, concrete next steps, most urgent first, each under 15 words"]
}

Rules:
- The "risks" array may ONLY contain names listed in "riskyCustomers". If that list is
  empty, return an empty risks array. Never infer risk from an outstanding balance alone —
  owing money is not the same as paying late.
- Every risk must cite real numbers from the data as evidence.
- Actions must be things the trader does today: who to chase, what to restock, what to stop selling on credit.
- Never say "your top customer is X" or restate totals they can already see.
- No hedging, no caveats about data size, no apologies.
- At most 3 risks and 4 actions.`;

  const raw = await callGroq(
    prompt,
    `You are a hard-nosed but fair business adviser to a small Nigerian trader.
You give decisions, not summaries. You are concise and specific. Output valid JSON only.`,
    { maxTokens: 700, json: true }
  );

  const allowedRisks = new Set(input.riskyCustomers.map((n) => n.toLowerCase()));

  try {
    const parsed = JSON.parse(raw);
    return {
      headline: String(parsed.headline ?? "").trim(),
      cashFlow: String(parsed.cashFlow ?? "").trim(),
      risks: Array.isArray(parsed.risks)
        ? parsed.risks
            .slice(0, 3)
            .map((r: any) => ({
              customer: String(r?.customer ?? "").trim(),
              evidence: String(r?.evidence ?? "").trim(),
            }))
            // Enforced in code, not just in the prompt: a flag the data does not
            // support is dropped even if the model insists on it.
            .filter((r: any) => r.customer && r.evidence && allowedRisks.has(r.customer.toLowerCase()))
        : [],
      actions: Array.isArray(parsed.actions)
        ? parsed.actions.slice(0, 4).map((a: any) => String(a).trim()).filter(Boolean)
        : [],
    };
  } catch {
    throw new AiError("The AI assistant returned an answer we could not read.");
  }
}

// ---------------------------------------------------------------------------
// Anomaly explanation
// ---------------------------------------------------------------------------

export async function explainAnomaly(anomaly: {
  type: string;
  order: { customerName: string; item: string; price: number };
  detail: string;
}): Promise<string> {
  const safe = sanitiseForAI({
    type: anomaly.type,
    customer: firstNameOnly(anomaly.order.customerName),
    item: anomaly.order.item,
    price: anomaly.order.price,
    detail: anomaly.detail,
  });

  return callGroq(
    `An order tracking system flagged this as unusual:\n${JSON.stringify(safe)}\n
Write ONE short sentence (under 25 words) telling the trader what to check, in plain
conversational language. No preamble, no hedging — direct and practical.`,
    "You are a financial safety assistant for a small trader. Be brief, direct, and practical.",
    { maxTokens: 60 }
  );
}
