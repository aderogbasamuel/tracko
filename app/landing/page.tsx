"use client";

import { useEffect, useRef } from "react";
import LandingNavbar from "./components/LandingNavbar";
import Hero from "./components/Hero";
import Ticker from "./components/Ticker";
import ProblemSection from "./components/ProblemSection";
import DifferenceSection from "./components/DifferenceSection";
import SolutionSection from "./components/SolutionSection";
import PitchSection from "./components/PitchSection";
import BmoniSection from "./components/BmoniSection";
import RoadmapSection from "./components/RoadmapSection";
import LandingFooter from "./components/Footer";

export default function LandingPage() {
  const ledgerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealables = document.querySelectorAll<HTMLElement>(".reveal");
    const counters = document.querySelectorAll<HTMLElement>(".count");

    revealables.forEach((el) => {
      const delay = el.getAttribute("data-reveal-delay");
      if (delay) el.style.setProperty("--reveal-delay", `${delay}ms`);
    });

    function formatNaira(value: number) {
      return value.toLocaleString("en-NG");
    }

    function countUp(el: HTMLElement) {
      const target = parseFloat(el.getAttribute("data-count-to") || "0") || 0;
      const duration = 1100;
      let start: number | null = null;

      if (reduceMotion) {
        el.textContent = formatNaira(target);
        return;
      }

      function step(now: number) {
        if (start === null) start = now;
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = formatNaira(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    }

    function showEverything() {
      revealables.forEach((el) => el.classList.add("is-in"));
      const ledger = ledgerRef.current;
      if (ledger) ledger.classList.add("is-in");
      counters.forEach((el) => {
        el.textContent = formatNaira(parseFloat(el.getAttribute("data-count-to") || "0") || 0);
      });
    }

    if (!("IntersectionObserver" in window) || reduceMotion) {
      showEverything();
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          countUp(entry.target as HTMLElement);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    revealables.forEach((el) => revealObserver.observe(el));
    counters.forEach((el) => counterObserver.observe(el));

    let ledgerObserver: IntersectionObserver | undefined;
    const ledger = ledgerRef.current;
    if (ledger) {
      ledgerObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            ledger.classList.add("is-in");
            ledgerObserver?.disconnect();
          });
        },
        { threshold: 0.25 }
      );
      ledgerObserver.observe(ledger);
    }

    return () => {
      revealObserver.disconnect();
      counterObserver.disconnect();
      ledgerObserver?.disconnect();
    };
  }, []);

  return (
    <>
      <LandingNavbar />
      <main id="top">
        <Hero ledgerRef={ledgerRef} />
        <Ticker />
        <ProblemSection />
        <DifferenceSection />
        <SolutionSection />
        <PitchSection />
        <BmoniSection />
        <RoadmapSection />
        <section className="cta" id="cta">
          <div className="cta__inner reveal">
            <h2 className="cta__title">
              Watch Tracko turn a day of trading into a business you can actually see.
            </h2>
            <p className="cta__body">
              Three minutes: log a cash sale, log a credit sale, watch the AI raise a risk flag on tracked data, and read the evening WhatsApp recap — all on one BMONI-verified ledger.
            </p>
            <a className="btn btn--primary btn--lg" href="#">
              See the 3-minute demo
            </a>
            <p className="cta__foot">
              Merchant Decisions track · NITHUB Innovation Fair 2026
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
