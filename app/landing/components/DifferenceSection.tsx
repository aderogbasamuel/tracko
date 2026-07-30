const pillarData = [
  {
    label: "01",
    title: "Every naira is tracked, not just the digital ones",
    body: "Most tools are formal-sector budgeting apps in disguise — they only see what touches a bank rail. Tracko tracks sales, expenses, and cash flow the way she actually runs her business, with credit given to customers as one tracked line among many, not a separate app.",
  },
  {
    label: "02",
    title: "AI that acts, not just a dashboard that reports",
    body: "A summary tells her what happened. Tracko&apos;s AI reasons across everything it&apos;s tracked — sales, credit, spending — to surface risk flags and cash-gap warnings before they become a problem.",
  },
  {
    label: "03",
    title: "Built on BMONI, not bolted on top",
    body: "BMONI&apos;s transaction infrastructure is what makes the tracking trustworthy in the first place — every digital payment is verified at the rail, so the AI is reasoning over real data, not self-reported numbers.",
  },
];

export default function DifferenceSection() {
  return (
    <section className="section" id="difference">
      <div className="container">
        <span className="eyebrow reveal">WHAT MAKES TRACKO DIFFERENT</span>
        <h2 className="section__title reveal">Not another budgeting app with a Nigerian flag on it.</h2>
        <div className="pillars">
          {pillarData.map((item) => (
            <article className="pillar reveal" key={item.label}>
              <span className="pillar__n">{item.label}</span>
              <h3 className="pillar__title">{item.title}</h3>
              <p className="pillar__body">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
