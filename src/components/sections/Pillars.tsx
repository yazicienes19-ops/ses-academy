"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Eye, Megaphone, Handshake, Lightbulb, Users, ArrowRight } from "lucide-react";

const pillars = [
  {
    icon: Eye,
    number: "01",
    title: "Insight",
    description: "Politik, Gesellschaft und Medien verstehen. Zusammenhänge erkennen, Orientierung gewinnen und informiert beitragen.",
  },
  {
    icon: Megaphone,
    number: "02",
    title: "Voice",
    description: "Eigene Stimme finden – online und offline. Klare Botschaften formulieren, Debatten verstehen und Anliegen sichtbar machen.",
  },
  {
    icon: Handshake,
    number: "03",
    title: "Connect",
    description: "Brücken bauen zwischen Menschen und Themen. Beziehungen aufbauen, Vertrauen schaffen und Menschen zusammenbringen.",
    featured: true,
  },
  {
    icon: Lightbulb,
    number: "04",
    title: "Create",
    description: "Ideen in echte Projekte verwandeln. Von der ersten Idee bis zur Umsetzung: Engagement praktisch und nachhaltig gestalten.",
  },
  {
    icon: Users,
    number: "05",
    title: "Participate",
    description: "Verantwortung übernehmen – für sich selbst, für andere und für die Gesellschaft. Demokratische Prinzipien leben.",
  },
];

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll(".reveal").forEach((child) => child.classList.add("is-visible"));
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

export function Pillars() {
  const ref = useReveal<HTMLElement>();

  return (
    <section className="py-32 bg-white" ref={ref}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20 grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
          <div className="reveal">
            <div className="ses-eyebrow mb-6">Unser Programm</div>
            <h2 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              Fünf Säulen der <span className="text-ses-green">Bildung</span>
            </h2>
          </div>
          <div className="reveal reveal-delay-1">
            <p className="text-lg text-muted leading-relaxed lg:max-w-md lg:ml-auto">
              In mehr als zehn praxisorientierten Modulen entwickeln Sie über zwei Jahre hinweg diese zentralen Kompetenzen.
            </p>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.slice(0, 2).map((pillar) => (
            <div
              key={pillar.title}
              className="reveal group p-8 rounded-2xl bg-ses-green-50/50 border border-ses-green-light hover:border-ses-green-muted hover:bg-white transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-ses-green-light flex items-center justify-center group-hover:bg-ses-green transition-colors duration-300">
                  <pillar.icon className="w-6 h-6 text-ses-green group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-[family-name:var(--font-playfair)] text-sm text-muted/50 font-medium">{pillar.number}</span>
              </div>
              <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-foreground mb-3">
                {pillar.title}
              </h3>
              <p className="text-muted leading-relaxed text-sm">
                {pillar.description}
              </p>
            </div>
          ))}

          {/* Featured: Connect */}
          <div className="reveal reveal-delay-1 group p-8 rounded-2xl bg-ses-green-dark text-white relative overflow-hidden md:col-span-2 lg:col-span-1 lg:row-span-2 flex flex-col justify-between">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-ses-green-muted/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gold/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                  <Handshake className="w-6 h-6 text-gold" />
                </div>
                <span className="font-[family-name:var(--font-playfair)] text-sm text-white/40 font-medium">03</span>
              </div>
              <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold mb-3">
                Connect
              </h3>
              <p className="text-white/70 leading-relaxed text-sm mb-6">
                Brücken bauen zwischen Menschen und Themen. Beziehungen aufbauen, Vertrauen schaffen und Menschen zusammenbringen.
              </p>
            </div>
            <Link href="/ueber-uns" className="relative inline-flex items-center gap-2 text-gold text-sm font-semibold hover:gap-3 transition-all duration-200">
              Mehr über das Programm
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {pillars.slice(3).map((pillar) => (
            <div
              key={pillar.title}
              className="reveal group p-8 rounded-2xl bg-ses-green-50/50 border border-ses-green-light hover:border-ses-green-muted hover:bg-white transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-ses-green-light flex items-center justify-center group-hover:bg-ses-green transition-colors duration-300">
                  <pillar.icon className="w-6 h-6 text-ses-green group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-[family-name:var(--font-playfair)] text-sm text-muted/50 font-medium">{pillar.number}</span>
              </div>
              <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-foreground mb-3">
                {pillar.title}
              </h3>
              <p className="text-muted leading-relaxed text-sm">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
