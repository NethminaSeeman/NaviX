import { useState } from "react";
import MapView from "@/components/MapView";
import { socialLinks } from "@/utils/mockData";

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="space-y-5">
      <div className="tech-panel px-4 py-4 md:px-5">
        <h1 className="section-title">Contact NaviX</h1>
        <p className="mono-label mt-2 text-[11px] text-slate-500 dark:text-cyan-300/80">
          Support And Partnerships
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="tech-panel space-y-3 p-5">
          <input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900"
            required
          />
          <input
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="Email"
            type="email"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900"
            required
          />
          <textarea
            value={form.message}
            onChange={(event) => update("message", event.target.value)}
            placeholder="How can we help with your trip?"
            rows={5}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900"
            required
          />
          <button
            type="submit"
            className="tech-button"
          >
            Send Message
          </button>
          {submitted && (
            <p className="text-xs text-green-600">
              Message submitted. Our team will contact you shortly.
            </p>
          )}
          <div className="pt-2 text-sm">
            <p className="mono-label mb-1 text-[11px] text-slate-500 dark:text-cyan-300/80">
              Social Links
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-600 hover:underline dark:text-cyan-300"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </form>
        <MapView places={[]} />
      </div>
    </section>
  );
};

export default ContactPage;
