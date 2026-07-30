const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant"; // fast + free-tier friendly

async function callGroq(prompt: string, systemPrompt?: string, maxTokens = 200): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No text returned from Groq");
  return text.trim();
}

export async function generateFollowUpMessage(params: {
  customerName: string;
  item: string;
  type: "REMINDER" | "DELIVERY" | "THANKS";
}) {
  const { customerName, item, type } = params;

  const instructions: Record<string, string> = {
    REMINDER: `Write a short, friendly payment reminder message to ${customerName} about their order of "${item}". Keep it under 30 words, warm but direct, suitable for WhatsApp.`,
    DELIVERY: `Write a short, friendly delivery update message to ${customerName} letting them know their order of "${item}" is on its way. Keep it under 30 words, suitable for WhatsApp.`,
    THANKS: `Write a short, warm thank-you message to ${customerName} for buying "${item}". Keep it under 30 words, suitable for WhatsApp.`,
  };

  return callGroq(
    instructions[type],
    "You write short, warm, natural WhatsApp messages for a small trader in Nigeria. No emojis unless natural. No preamble, just the message text."
  );
}

export async function generateInsightsSummary(orders: any[], walletBalance?: number) {
  const summaryInput = orders.map((o) => ({
    customer: o.customerName,
    item: o.item,
    price: o.price,
    status: o.status,
    date: o.createdAt,
  }));

  const prompt = `Here is a trader's order data (JSON) and their current BMONI wallet balance:

Wallet balance: ₦${walletBalance ?? "unknown"}
Orders: ${JSON.stringify(summaryInput)}

Write a summary in EXACTLY 1-2 short sentences, under 45 words total. Rules:
- Mention the wallet balance in plain language (what it means for the trader right now)
- State total revenue from PAID orders only (₦0 if none paid yet)
- Name the top customer by order count if there's a clear one
- If there's only one order, just state the customer and item plainly — do NOT mention that data is "incomplete" or apologize for small sample size
- No caveats, no hedging, no meta-commentary about the data itself
- Sound like a quick text update, not a report

Summary:`;

  return callGroq(
    prompt,
    "You are a business assistant for a small trader. Be extremely concise, direct, and practical. Never mention data limitations or apologize. Output only the summary, nothing else.",
    70
  );
}

export async function explainAnomaly(anomaly: {
  type: string;
  order: { customerName: string; item: string; price: number };
  detail: string;
}) {
  const prompt = `An informal trader's order tracking system flagged this as unusual:

Type: ${anomaly.type}
Customer: ${anomaly.order.customerName}
Item: ${anomaly.order.item}
Price: ₦${anomaly.order.price}
Detail: ${anomaly.detail}

Write ONE short sentence (under 25 words) telling the trader what to check, in plain
conversational language. No preamble, no "this could be" hedging — be direct and
practical, like a quick heads-up from a helpful assistant.`;

  return callGroq(
    prompt,
    "You are a financial safety assistant for a small trader. Be brief, direct, and practical.",
    50
  );
}