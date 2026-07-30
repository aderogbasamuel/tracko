"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const NAV_LINKS = [
  { href: "#problem", label: "The blind spot" },
  { href: "#solution", label: "What it does" },
  { href: "#bmoni", label: "Why BMONI" },
  { href: "#roadmap", label: "Roadmap" },
];

export default function LandingNavbar() {
  const [navOpen, setNavOpen] = useState(false);
  const [navStuck, setNavStuck] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setNavStuck(window.scrollY > 8);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && navOpen) {
        setNavOpen(false);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navOpen]);

  return (
    <header className={`nav${navStuck ? " is-stuck" : ""}`} id="nav">
      <div className="nav__inner">
        <a className="brand" href="#top">
          <Image src="/logo.png" alt="Tracko logo" width={32} height={32} className="brand__mark" />
          <span className="brand__word">tracko</span>
        </a>
        <nav
          className={`nav__links${navOpen ? " is-open" : ""}`}
          id="navLinks"
          aria-label="Sections"
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === "A") setNavOpen(false);
          }}
        >
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <a className="btn btn--nav nav__links-cta" href="/signup">
            Get Started
          </a>
        </nav>

        <a className="btn btn--nav nav__cta" href="/signup">
          Get Started
        </a>

        <button
          className="nav__toggle"
          id="navToggle"
          aria-label="Menu"
          aria-expanded={navOpen}
          aria-controls="navLinks"
          onClick={() => setNavOpen((open) => !open)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}
