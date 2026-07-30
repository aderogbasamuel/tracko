import Image from "next/image";
import type { RefObject } from "react";

interface HeroProps {
  ledgerRef: RefObject<HTMLDivElement | null>;
}

export default function Hero({ ledgerRef }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero__glow" aria-hidden="true"></div>
      <div className="hero__copy reveal">
        <span className="eyebrow-pill">
          NITHUB INNOVATION FAIR 2026 · INTELLIGENT MONEY FOR EVERYONE
        </span>
        <h1 className="hero__title">
          You&apos;re not broke.
          <br />
          You&apos;re <span className="mark-underline">untracked</span>.
        </h1>
        <p className="hero__lede">
          Six out of ten naira in Nigeria moves through the informal market — in notebooks,
          in memory, or in WhatsApp chat. Tracko is an AI assistant, built on BMONI&apos;s verified
          transaction rails, that tracks everything that actually happens in a trader&apos;s business —
          <strong>sales, expenses, cash flow, and yes, the credit she gives her customers</strong> —
          and turns all of it into decisions she can act on today.
        </p>
        <div className="hero__actions">
          <a className="btn btn--primary" href="#cta">
            See the 3-minute demo
          </a>
          <a className="btn btn--outline" href="#solution">
            How it works
          </a>
        </div>
        <p className="hero__meta">
          <span className="dot-live" aria-hidden="true"></span>
          Built on <strong>BMONI</strong> · AI reasoning over verified transactions, not guesses
        </p>
      </div>

      <div className="hero__visual reveal" data-reveal-delay="120">
        <div
          className="ledger aso"
          ref={ledgerRef}
          role="img"
          aria-label="Tracko ledger screen showing 128,500 naira in tracked customer credit, one line in Iya Amaka's full business record, with an AI risk flag on Chinedu."
        >
          <div className="ledger__top">
            <div className="ledger__who">
              <span className="ledger__avatar">IA</span>
              <span>
                <strong>Iya Amaka</strong>
                <em>Oshodi Market, Lagos</em>
              </span>
            </div>
            <span className="chip chip--live">
              <span className="dot-live" aria-hidden="true"></span>Live
            </span>
          </div>

          <div className="ledger__hero">
            <span className="ledger__label">CREDIT TRACKED RIGHT NOW</span>
            <p className="ledger__amount">
              ₦<span className="count" data-count-to="128500">0</span>
            </p>
            <span className="ledger__sub">
              One line in her full ledger · 9 customers, 3 overdue
            </span>
          </div>

          <ul className="ledger__rows">
            <li className="ledger__row" data-row="1">
              <span className="ledger__name">Chinedu O.</span>
              <span className="ledger__amt">₦42,000</span>
              <span className="chip chip--danger">12 days late</span>
            </li>
            <li className="ledger__row" data-row="2">
              <span className="ledger__name">Mama Nkechi</span>
              <span className="ledger__amt">₦31,500</span>
              <span className="chip chip--warn">Due Friday</span>
            </li>
            <li className="ledger__row" data-row="3">
              <span className="ledger__name">Bisi A.</span>
              <span className="ledger__amt">₦18,000</span>
              <span className="chip chip--ok">Paid · BMONI</span>
            </li>
          </ul>

          <div className="ledger__flag" data-row="4">
            <span className="ledger__flag-icon" aria-hidden="true">
              !
            </span>
            <p>
              <strong>
                AI flag: Chinedu&apos;s balance has grown 3 weeks straight.
              </strong>
              Best not to give more credit today — he owes ₦42,000 already.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
