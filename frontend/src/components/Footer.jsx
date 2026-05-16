import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-slate-200 bg-white/80 px-4 py-6 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center md:flex-row md:text-left">
      <p>
        CeyGo - AI-Powered Sri Lankan Travel Companion. Built with live maps,
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
