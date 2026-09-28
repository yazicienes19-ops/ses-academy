"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) { setSubmitted(true); setEmail(""); }
  };

  return (
    <section className="py-32 bg-gray-50">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="max-w-2xl">
          <div className="ses-eyebrow mb-6">Newsletter</div>

          <h2 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl font-bold text-foreground mb-6">
            Bleiben Sie informiert
          </h2>

          <p className="text-xl text-muted mb-10">
            Erhalten Sie Updates zu unserer Arbeit, kommenden Modulen und Neuigkeiten der SES Academy.
          </p>

          {submitted ? (
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-ses-green-light text-ses-green font-semibold">
              <CheckCircle className="w-5 h-5" />
              Vielen Dank! Sie sind jetzt angemeldet.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ihre E-Mail-Adresse"
                required
                className="flex-grow px-5 py-3.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ses-green/20 focus:border-ses-green text-base"
              />
              <button type="submit" className="ses-button ses-button-primary px-8">
                <Send className="w-5 h-5" />
                Abonnieren
              </button>
            </form>
          )}

          <p className="text-sm text-muted mt-4">
            Kein Spam. Nur Updates zur SES Academy. Jederzeit abmeldbar.
          </p>
        </div>
      </div>
    </section>
  );
}
