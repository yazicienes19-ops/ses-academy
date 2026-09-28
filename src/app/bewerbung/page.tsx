"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, ArrowRight, ArrowLeft, User, FileText, Send } from "lucide-react";

interface BewerbungForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  country: string;
  city: string;
  education: string;
  university: string;
  field: string;
  experience: string;
  motivation: string;
  contribution: string;
  expectations: string;
  agreeTerms: boolean;
}

const steps = [
  { id: 1, title: "Persönliche Daten", icon: User },
  { id: 2, title: "Bildung & Erfahrung", icon: FileText },
  { id: 3, title: "Motivation", icon: FileText },
  { id: 4, title: "Bestätigung", icon: CheckCircle },
];

const inputClasses = "w-full px-4 py-3 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ses-green/20 focus:border-ses-green transition-all duration-150";

export default function BewerbungPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<BewerbungForm>({ firstName: "", lastName: "", email: "", phone: "", birthDate: "", country: "", city: "", education: "", university: "", field: "", experience: "", motivation: "", contribution: "", expectations: "", agreeTerms: false });
  const update = (field: string, value: string | boolean) => setForm({ ...form, [field]: value });

  if (submitted) return (
    <section className="pt-36 pb-32 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <div className="w-20 h-20 bg-ses-green rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-foreground mb-4">Vielen Dank für Ihre Bewerbung!</h1>
        <p className="text-muted mb-8">Wir melden uns innerhalb von 2 Wochen bei Ihnen.</p>
        <Link href="/" className="ses-button ses-button-primary">Zurück zur Startseite</Link>
      </div>
    </section>
  );

  return (
    <>
      <section className="pt-36 pb-12 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="ses-eyebrow mb-4">Bewerbung</div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl font-bold text-foreground mb-6">Jetzt bewerben</h1>
            <p className="text-lg text-muted leading-relaxed">Werden Sie Teil der SES Academy. Die Bewerbung ist kostenlos.</p>
          </div>
        </div>
      </section>

      <section className="pb-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          {/* Progress */}
          <div className="flex items-center justify-between mb-10">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${step >= s.id ? "bg-ses-green text-white shadow-lg shadow-ses-green/30" : "bg-white border-2 border-border text-muted"}`}>
                    {step > s.id ? <CheckCircle className="w-5 h-5" /> : s.id}
                  </div>
                  <span className={`text-xs mt-2 hidden sm:block ${step >= s.id ? "text-ses-green font-medium" : "text-muted"}`}>{s.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 mx-3 flex-1 ${step > s.id ? "bg-ses-green" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Form Card */}
          <div className="bg-white p-8 rounded-xl border border-border shadow-sm">
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground mb-6">Persönliche Daten</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Vorname *</label>
                    <input type="text" required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className={inputClasses} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nachname *</label>
                    <input type="text" required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className={inputClasses} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">E-Mail *</label>
                  <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClasses} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Telefon</label>
                    <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClasses} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Geburtsdatum *</label>
                    <input type="date" required value={form.birthDate} onChange={(e) => update("birthDate", e.target.value)} className={inputClasses} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Land *</label>
                    <select required value={form.country} onChange={(e) => update("country", e.target.value)} className={inputClasses}>
                      <option value="">Bitte wählen</option>
                      <option value="DE">Deutschland</option>
                      <option value="FR">Frankreich</option>
                      <option value="AT">Österreich</option>
                      <option value="NL">Niederlande</option>
                      <option value="BE">Belgien</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Stadt *</label>
                    <input type="text" required value={form.city} onChange={(e) => update("city", e.target.value)} className={inputClasses} />
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground mb-6">Bildung & Erfahrung</h2>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Aktueller Status *</label>
                  <select required value={form.education} onChange={(e) => update("education", e.target.value)} className={inputClasses}>
                    <option value="">Bitte wählen</option>
                    <option value="student">Student*in</option>
                    <option value="working">Berufstätig</option>
                    <option value="phd">Promovierend</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Universität / Arbeitgeber</label>
                  <input type="text" value={form.university} onChange={(e) => update("university", e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Studienfach / Berufsfeld</label>
                  <input type="text" value={form.field} onChange={(e) => update("field", e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Bisheriges Engagement</label>
                  <textarea rows={4} value={form.experience} onChange={(e) => update("experience", e.target.value)} placeholder="Beschreiben Sie Ihr bisheriges Engagement..." className={`${inputClasses} resize-none`} />
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground mb-6">Motivation</h2>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Warum SES Academy? *</label>
                  <textarea rows={5} required value={form.motivation} onChange={(e) => update("motivation", e.target.value)} className={`${inputClasses} resize-none`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Was bringen Sie mit?</label>
                  <textarea rows={4} value={form.contribution} onChange={(e) => update("contribution", e.target.value)} className={`${inputClasses} resize-none`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Ihre Erwartungen</label>
                  <textarea rows={4} value={form.expectations} onChange={(e) => update("expectations", e.target.value)} className={`${inputClasses} resize-none`} />
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-5">
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-foreground mb-6">Bestätigung</h2>
                <div className="bg-ses-green-light p-6 rounded-xl">
                  <h3 className="font-semibold text-foreground mb-4">Ihre Angaben</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted">Name:</span>
                      <span className="ml-2 font-medium">{form.firstName} {form.lastName}</span>
                    </div>
                    <div>
                      <span className="text-muted">E-Mail:</span>
                      <span className="ml-2 font-medium">{form.email}</span>
                    </div>
                    <div>
                      <span className="text-muted">Land:</span>
                      <span className="ml-2 font-medium">{form.country}</span>
                    </div>
                    <div>
                      <span className="text-muted">Stadt:</span>
                      <span className="ml-2 font-medium">{form.city}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" required checked={form.agreeTerms} onChange={(e) => update("agreeTerms", e.target.checked)} className="mt-1 w-4 h-4 text-ses-green border-gray-300 rounded" />
                  <label className="text-sm text-muted">Ich stimme der Verarbeitung meiner Daten gemäß der Datenschutzerklärung zu. *</label>
                </div>
              </div>
            )}
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="ses-button ses-button-outline">
                  <ArrowLeft className="w-4 h-4" />
                  Zurück
                </button>
              ) : <div />}
              {step < 4 ? (
                <button onClick={() => setStep(step + 1)} className="ses-button ses-button-primary">
                  Weiter
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => setSubmitted(true)} className="ses-button ses-button-primary">
                  <Send className="w-4 h-4" />
                  Absenden
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
