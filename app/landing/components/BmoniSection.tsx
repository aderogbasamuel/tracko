import Image from "next/image";

export default function BmoniSection() {
  return (
    <section className="section section--teal" id="bmoni">
      <div className="container bmoni">
        <div className="bmoni__copy reveal">
          <span className="eyebrow eyebrow--gold">WHY BMONI</span>
          <h2 className="bmoni__title">
            Not a payment button. The backbone of everything Tracko tracks.
          </h2>
          <p className="bmoni__body">
            A sale, an expense, or a repayment isn&apos;t just logged — it&apos;s confirmed by BMONI, and every one of those tracked events feeds the same payment history. That&apos;s the layer the AI actually reasons over. Over time it becomes something a Lagos trader has never had: a verified financial record — the thing that eventually unlocks real credit, on top of a system built to track her whole business, not just what she lends out.
          </p>
          <div className="bmoni__caps">
            <div className="cap-card">
              <p className="cap-card__title">NGN virtual account</p>
              <p className="cap-card__body">Customer and supplier payments become trackable data.</p>
            </div>
            <div className="cap-card">
              <p className="cap-card__title">Multi-currency wallets</p>
              <p className="cap-card__body">Hold value in Naira or USD, for cross-border buyers.</p>
            </div>
            <div className="cap-card">
              <p className="cap-card__title">Stablecoin-backed USD</p>
              <p className="cap-card__body">Savings shielded from Naira depreciation.</p>
            </div>
            <div className="cap-card">
              <p className="cap-card__title">Card issuance</p>
              <p className="cap-card__body">Virtual and physical cards, spending the wallet balance.</p>
            </div>
          </div>
        </div>

        <div className="split reveal" data-reveal-delay="120">
          <p className="split__head">Why not just automate everything?</p>
          <p className="split__note">
            Because most of her money is cash, and cash never touches an API. So Tracko is deliberately hybrid — and says so.
          </p>
          <div className="split__row">
            <span className="split__tag split__tag--auto">DIGITAL</span>
            <p>
              <strong>Captured automatically</strong> through BMONI. Zero effort, zero typing.
            </p>
          </div>
          <div className="split__row">
            <span className="split__tag split__tag--manual">CASH</span>
            <p>
              <strong>Logged in seconds</strong>, in her own words. Low friction beats false promises.
            </p>
          </div>
          <p className="split__foot">
            The risk logic is arithmetic, not a model trained on synthetic data — so every flag comes with a reason she can check.
          </p>
        </div>
      </div>
    </section>
  );
}
