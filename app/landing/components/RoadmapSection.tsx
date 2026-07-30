const roadmapItems = [
  {
    number: "01",
    title: "Voice-first, in her language",
    body: "Log sales by speaking — Yoruba, Igbo, Hausa, Pidgin — for traders with lower typing comfort.",
  },
  {
    number: "02",
    title: "Two-way WhatsApp bot",
    body: "Reply to the recap to log a sale or chase a debt, without opening anything else.",
  },
  {
    number: "03",
    title: "Formal credit scoring",
    body: "A score built from verified BMONI payments and real credit-sale history.",
  },
  {
    number: "04",
    title: "Inventory that restocks itself",
    body: "Tied to sales data, so “rice is finishing” becomes an alert, not a surprise.",
  },
];

export default function RoadmapSection() {
  return (
    <section className="section" id="roadmap">
      <div className="container">
        <span className="eyebrow reveal">AFTER THE HACKATHON</span>
        <h2 className="section__title reveal">What comes after the demo.</h2>
        <div className="roadmap">
          {roadmapItems.map((item, index) => (
            <article className="roadmap__step reveal" data-reveal-delay={`${index * 80}`} key={item.number}>
              <span className="roadmap__n">{item.number}</span>
              <h3 className="roadmap__title">{item.title}</h3>
              <p className="roadmap__body">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
