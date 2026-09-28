"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

const questions = [
  { id: 1, type: "scale" as const, question: "Wie zufrieden waren Sie mit dem letzten Modul?", options: ["1", "2", "3", "4", "5"] },
  { id: 2, type: "single" as const, question: "Wie bewerten Sie die Qualität der Referent*innen?", options: ["Sehr gut", "Gut", "Befriedigend", "Ausreichend", "Mangelhaft"] },
  { id: 3, type: "multi" as const, question: "Welche Themen sollten behandelt werden? (Mehrfachauswahl)", options: ["Klimawandel", "Digitalisierung", "Menschenrechte", "Bildung", "Wirtschaft", "Integration"] },
  { id: 4, type: "text" as const, question: "Haben Sie Verbesserungsvorschläge?" },
];

export default function UmfragePage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const q = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  if (submitted) return (
    <section className="pt-36 pb-32 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <div className="w-20 h-20 bg-ses-green rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-foreground mb-4">Vielen Dank!</h1>
        <p className="text-muted mb-8">Ihre Antworten wurden erfolgreich gespeichert.</p>
        <Link href="/umfragen" className="ses-button ses-button-primary">Zurück zu Umfragen</Link>
      </div>
    </section>
  );

  return (
    <>
      <section className="pt-36 pb-12 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-12">
          <Link href="/umfragen" className="inline-flex items-center gap-2 text-ses-green hover:underline mb-8 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-foreground">Zufriedenheit mit Modul 3</h1>
        </div>
      </section>

      <section className="pb-24 bg-gray-50 min-h-[60vh]">
        <div className="max-w-2xl mx-auto px-6 lg:px-12">
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted mb-2">
              <span>Frage {step + 1} von {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-ses-green transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl border border-border shadow-sm mb-8">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-foreground mb-6">{q.question}</h2>

            {q.type === "scale" && (
              <div className="flex gap-3 justify-center">
                {q.options?.map((o) => (
                  <button
                    key={o}
                    onClick={() => setAnswers({ ...answers, [q.id]: o })}
                    className={`w-14 h-14 rounded-xl font-bold text-lg transition-all duration-150 ${answers[q.id] === o ? "bg-ses-green text-white shadow-lg shadow-ses-green/30" : "bg-gray-100 text-muted hover:bg-ses-green-light"}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}

            {q.type === "single" && (
              <div className="space-y-3">
                {q.options?.map((o) => (
                  <button
                    key={o}
                    onClick={() => setAnswers({ ...answers, [q.id]: o })}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-150 ${answers[q.id] === o ? "bg-ses-green text-white shadow-lg shadow-ses-green/30" : "bg-gray-50 text-foreground hover:bg-ses-green-light border border-transparent hover:border-ses-green"}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}

            {q.type === "multi" && (
              <div className="space-y-3">
                {q.options?.map((o) => {
                  const current = answers[q.id];
                  const sel = Array.isArray(current) && current.includes(o);
                  const list = Array.isArray(current) ? current : [];
                  return (
                    <button
                      key={o}
                      onClick={() => {
                        setAnswers({ ...answers, [q.id]: sel ? list.filter((v: string) => v !== o) : [...list, o] });
                      }}
                      className={`w-full p-4 rounded-xl text-left transition-all duration-150 ${sel ? "bg-ses-green text-white shadow-lg shadow-ses-green/30" : "bg-gray-50 text-foreground hover:bg-ses-green-light border border-transparent hover:border-ses-green"}`}
                    >
                      {sel && <CheckCircle className="w-4 h-4 inline mr-2" />}
                      {o}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "text" && (
              <textarea
                rows={5}
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Ihre Antwort..."
                className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ses-green/20 focus:border-ses-green resize-none"
              />
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="ses-button ses-button-outline disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>
            {step < questions.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="ses-button ses-button-primary">
                Weiter
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => setSubmitted(true)} className="ses-button ses-button-primary">
                <CheckCircle className="w-4 h-4" />
                Absenden
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
