import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-slate-200 bg-white/80 px-4 py-5 text-xs text-slate-500 dark:border-cyan-500/20 dark:bg-zinc-950/70 dark:text-slate-400">
    <div className="mx-auto flex max-w-[1560px] flex-col items-center justify-between gap-2 text-center md:flex-row md:text-left">
      <p>
        NaviX - AI-Powered Sri Lankan Travel Companion. Built with live maps,
        weather intelligence, and voice AI.
      </p>
      <div className="flex items-center gap-3">
        <Link to="/about" className="transition hover:text-ceygo-primary">
          About
        </Link>
        <Link to="/contact" className="transition hover:text-ceygo-primary">
          Contact
        </Link>
      </div>
    </div>
  </footer>
);

export default Footer;
