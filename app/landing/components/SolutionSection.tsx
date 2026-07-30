const featureCards = [
  {
    tag: "01 · LOG",
    title: "Sales & expense logging",
    body: "Say it plainly — “sold 3 bags rice, ₦12,000” — and it&apos;s logged. Digital money is captured automatically through BMONI; cash takes seconds by hand.",
  },
  {
    tag: "02 · LEDGER",
    title: "Customer & credit tracking",
    body: "Who bought on credit, how much, and when it&apos;s due — one running ledger among several, sitting next to her cash sales and expenses, not off in its own app.",
  },
  {
    tag: "03 · AI RISK",
    title: "AI risk flags",
    body: "Overdue debts, rising balances, repeat slow-payers — the AI reads the pattern across everything it&apos;s tracked and flags it before you extend more credit, with the reasoning shown, not hidden in a black box.",
    accent: true,
  },
  {
    tag: "04 · AI FORECAST",
    title: "Cash-flow-gap warnings",
    body: "The AI projects expected inflow minus expenses minus pending repayments across her tracked transactions — surfaced early enough that she can still do something about it.",
  },
  {
    tag: "05 · BMONI RAILS",
    title: "BMONI transaction infrastructure",
    body: "An NGN virtual account, multi-currency wallets, and card issuance turn every digital payment into verified, trackable data — the foundation everything above is built on.",
  },
  {
    tag: "06 · WHATSAPP",
    title: "AI end-of-day recap",
    body: "A summary of everything tracked that day, delivered where she already spends her time. No app to remember to open.",
  },
];

export default function SolutionSection() {
  return (
    <section className="section section--pattern" id="solution">
      <div className="container">
        <span className="eyebrow reveal">WHAT IT DOES</span>
        <h2 className="section__title reveal">One system. Six jobs done.</h2>
        <div className="feature-grid">
          {featureCards.map((card, index) => (
            <article
              className={`feature-card reveal${card.accent ? " feature-card--accent" : ""}`}
              data-reveal-delay={`${index * 60}`}
              key={card.tag}
            >
              <span className="feature-card__tag">{card.tag}</span>
              <h3 className="feature-card__title">{card.title}</h3>
              <p className="feature-card__body">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
