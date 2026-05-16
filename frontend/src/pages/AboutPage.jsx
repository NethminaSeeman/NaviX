const AboutPage = () => (
  <section className="space-y-5">
    <h1 className="section-title">About CeyGo</h1>
    <div className="glass-card space-y-4 p-5 text-sm text-slate-700 dark:text-slate-200">
      <p>
        CeyGo is an AI-powered travel companion built to make Sri Lankan tourism
        smarter, more local, and more immersive.
      </p>
      <p>
        The platform combines conversational AI, voice interactions, live map
        exploration, and weather-aware trip recommendations into one premium
        mobile-first experience.
      </p>
      <div>
        <h2 className="mb-2 text-base font-semibold">Technology Stack</h2>
        <p>
          React + Vite, TailwindCSS, React Router, Axios, Google Maps API, Web
          Speech API, Framer Motion, and FastAPI-compatible REST integrations.
        </p>
      </div>
      <div>
        <h2 className="mb-2 text-base font-semibold">Mission</h2>
        <p>
          Help every traveler discover Sri Lanka’s history, food, nature, and
          hidden gems with confidence and delight.
        </p>
      </div>
      <div>
        <h2 className="mb-2 text-base font-semibold">Team</h2>
        <p>
          Product Designers, Frontend Engineers, and AI Developers focused on
          travel-tech innovation.
        </p>
      </div>
    </div>
  </section>
);

export default AboutPage;
