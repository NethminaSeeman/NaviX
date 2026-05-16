import { useState } from "react";
import MapContainer from "@/components/MapContainer";
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
      <h1 className="section-title">Contact NaviX</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="glass-card space-y-3 p-5">
          <input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ceygo-primary dark:border-slate-700 dark:bg-slate-900"
            required
          />
          <input
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="Email"
            type="email"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ceygo-primary dark:border-slate-700 dark:bg-slate-900"
            required
          />
          <textarea
            value={form.message}
            onChange={(event) => update("message", event.target.value)}
            placeholder="How can we help with your trip?"
            rows={5}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ceygo-primary dark:border-slate-700 dark:bg-slate-900"
            required
          />
          <button
            type="submit"
            className="rounded-full bg-ceygo-primary px-5 py-2 text-sm font-semibold text-white"
          >
            Send Message
          </button>
          {submitted && (
            <p className="text-xs text-green-600">
              Message submitted. Our team will contact you shortly.
            </p>
          )}
          <div className="pt-2 text-sm">
            <p className="mb-1 font-semibold">Social Links</p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ceygo-secondary hover:underline"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </form>
        <MapContainer places={[]} />
      </div>
    </section>
  );
};

export default ContactPage;
