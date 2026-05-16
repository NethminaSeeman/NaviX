const AboutPage = () => (
  <section className="space-y-5">
    <div className="tech-panel px-4 py-4 md:px-5">
      <h1 className="section-title">About NaviX</h1>
      <p className="mono-label mt-2 text-[11px] text-slate-500 dark:text-cyan-300/80">
        Technical Travel Intelligence Platform
      </p>
    </div>
    <div className="tech-panel space-y-4 p-5 text-sm text-slate-700 dark:text-slate-200">
      <p>
        NaviX is an AI-powered travel companion built to make Sri Lankan tourism
        smarter, more local, and more immersive.
      </p>
      <p>
        The platform combines conversational AI, voice interactions, live map
        exploration, and weather-aware trip recommendations into one premium
        mobile-first experience.
      </p>
      <div>
        <h2 className="mono-label mb-2 text-[11px] text-slate-500 dark:text-cyan-300/80">
          Technology Stack
        </h2>
        <p>
          React + Vite, TailwindCSS, React Router, Axios, Google Maps API, Web
          Speech API, Framer Motion, and FastAPI-compatible REST integrations.
        </p>
      </div>
      <div>
        <h2 className="mono-label mb-2 text-[11px] text-slate-500 dark:text-cyan-300/80">
          Mission
        </h2>
        <p>
          Help every traveler discover Sri Lanka’s history, food, nature, and
          hidden gems with confidence and delight.
        </p>
      </div>
      <div>
        <h2 className="mono-label mb-2 text-[11px] text-slate-500 dark:text-cyan-300/80">
          Team
        </h2>
        <p>
          Product Designers, Frontend Engineers, and AI Developers focused on
          travel-tech innovation.
        </p>
      </div>
    </div>
  </section>
);

export default AboutPage;
