"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, Send, CheckCircle } from "lucide-react";

export default function KontaktPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true); };

  return (
    <>
      <section className="pt-36 pb-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="ses-eyebrow mb-4">Kontakt</div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl font-bold text-foreground mb-6">Kontakt</h1>
            <p className="text-lg text-muted leading-relaxed">Wir sind für Sie da. Zögern Sie nicht, uns zu kontaktieren.</p>
          </div>
        </div>
      </section>

      <section className="pb-16 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { title: "Allgemeine Anfragen", email: "ses@islamrat.de", desc: "Für allgemeine Fragen" },
            { title: "Presse & Medien", email: "presse@islamrat.de", desc: "Medienanfragen" },
            { title: "Bewerbungen", email: "bewerbung@ses-academy.de", desc: "Fragen zur Bewerbung" },
          ].map((c) => (
            <div key={c.title} className="bg-white p-6 rounded-xl border border-border text-center hover:border-ses-green-muted hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-ses-green-light rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-ses-green" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{c.title}</h3>
              <p className="text-muted text-sm mb-3">{c.desc}</p>
              <a href={`mailto:${c.email}`} className="text-ses-green font-medium hover:underline">{c.email}</a>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground mb-6">Nachricht senden</h2>
            {submitted ? (
              <div className="bg-ses-green-light p-8 rounded-xl text-center">
                <CheckCircle className="w-12 h-12 text-ses-green mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Nachricht gesendet!</h3>
                <p className="text-muted">Wir melden uns innerhalb von 48 Stunden.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ses-green/20 focus:border-ses-green" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">E-Mail *</label>
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ses-green/20 focus:border-ses-green" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Betreff *</label>
                  <select required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ses-green/20 focus:border-ses-green bg-white">
                    <option value="">Bitte wählen</option>
                    <option value="general">Allgemeine Anfrage</option>
                    <option value="application">Bewerbung</option>
                    <option value="press">Presseanfrage</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nachricht *</label>
                  <textarea rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ses-green/20 focus:border-ses-green resize-none" />
                </div>
                <button type="submit" className="ses-button ses-button-primary">
                  <Send className="w-4 h-4" />
                  Nachricht senden
                </button>
              </form>
            )}
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground mb-6">Standort</h2>
            <div className="rounded-xl overflow-hidden border border-border mb-6">
              <div className="h-64 bg-gradient-to-br from-ses-green-light to-ses-green-50 flex items-center justify-center">
                <div className="text-center text-muted">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-ses-green" />
                  <p className="font-medium text-foreground">Köln, Deutschland</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-ses-green mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">Islamrat für die BRD</div>
                  <div className="text-muted text-sm">Colonia-Allee 3, 51067 Köln</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-ses-green" />
                <span className="text-muted">+49 221 942 240 – 210</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-ses-green" />
                <a href="mailto:ses@islamrat.de" className="text-ses-green hover:underline">ses@islamrat.de</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
