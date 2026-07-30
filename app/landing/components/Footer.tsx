import Image from "next/image";

export default function LandingFooter() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="brand brand--sm">
          <Image src="/logo.png" alt="Tracko logo" width={26} height={26} className="brand__mark" />
          <span className="brand__word brand__word--sm">tracko</span>
        </div>
        <span className="footer__note">Intelligent money for everyone · Built on BMONI</span>
      </div>
    </footer>
  );
}
