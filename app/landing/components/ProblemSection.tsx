const problemCards = [
  {
    title: "The book is the system",
    body: "Sales, expenses, restocks, and the credit she gives out all live in a notebook, a memory, or a WhatsApp chat. When the page turns, that information quietly disappears — and so does the money.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h11l5 5v11H4z"></path>
        <path d="M8 10h6M8 14h4"></path>
      </svg>
    ),
  },
  {
    title: "She feels broke while she&apos;s rich",
    body: "Cash is low today, so she stops buying stock — not knowing thousands of naira are sitting with customers she served three weeks ago.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M12 7v5l3 2"></path>
      </svg>
    ),
  },
  {
    title: "No record, no recognition",
    body: "She has a bank account, but it was never built for her rhythm. With no usable history, credit and growth capital stay out of reach.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l5-5 4 3 5-7"></path>
        <path d="M3 21h18"></path>
      </svg>
    ),
  },
];

export default function ProblemSection() {
  return (
    <section className="section section--dark" id="problem">
      <div className="container">
        <span className="eyebrow eyebrow--cyan reveal">THE BLIND SPOT</span>
        <h2 className="section__title section__title--light reveal">
          It&apos;s not a literacy problem. It&apos;s a <span className="hl">recognition</span> problem.
        </h2>

        <div className="stats reveal">
          <div className="stat">
            <p className="stat__num">
              <span className="count" data-count-to="60">0</span>
              %
            </p>
            <p className="stat__cap">of Nigeria&apos;s income comes from the informal sector</p>
          </div>
          <div className="stat">
            <p className="stat__num">₦?</p>
            <p className="stat__cap">what she&apos;s owed today — nobody can say</p>
          </div>
          <div className="stat">
            <p className="stat__num">0</p>
            <p className="stat__cap">systems that read her trade as real financial behaviour</p>
          </div>
        </div>

        <figure className="quote reveal">
          <blockquote>
            &ldquo;I know I sold plenty this month. I just don&apos;t know who is still owing me.&rdquo;
          </blockquote>
          <figcaption>Iya Amaka — trader, Oshodi Market</figcaption>
        </figure>

        <div className="problem-grid">
          {problemCards.map((card, index) => (
            <article className="problem-card reveal" key={card.title} data-reveal-delay={`${index * 90}`}>
              <div className="problem-card__icon" aria-hidden="true">{card.icon}</div>
              <h3 className="problem-card__title">{card.title}</h3>
              <p className="problem-card__body">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
