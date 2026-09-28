"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center bg-[#0a3d24] overflow-hidden">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
        backgroundSize: '32px 32px'
      }} />

      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-32 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Content */}
          <div className="lg:col-span-7">
            {/* Badge */}
            <div className="animate-fade-in inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-white/90 text-sm font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              Politische Bildung für junge Muslime in Europa
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in delay-100 font-[family-name:var(--font-playfair)] text-5xl sm:text-6xl lg:text-[4.5rem] font-bold text-white leading-[1.08] mb-8">
              Zwei Jahre{' '}
              <span className="relative inline-block">
                <span className="relative z-10">Bildung.</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-gold/40 -z-0 rounded-sm" />
              </span>
              <br />
              <span className="text-emerald-300">Zehn Module.</span>
              <br />
              <span className="text-white/80">Eine Gemeinschaft.</span>
            </h1>

            {/* Subline */}
            <p className="animate-fade-in delay-200 text-lg sm:text-xl text-white/70 leading-relaxed mb-12 max-w-xl">
              Ein zweijähriges Bildungs- und Empowerment-Programm für rund 150 junge Musliminnen und Muslime aus Deutschland, Frankreich und Österreich.
            </p>

            {/* CTAs */}
            <div className="animate-fade-in delay-300 flex flex-col sm:flex-row gap-4 mb-16">
              <Link href="/bewerbung" className="ses-button ses-button-white text-base px-8 py-4">
                Jetzt bewerben
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/ueber-uns" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-white/30 text-white font-semibold hover:bg-white/10 hover:border-white/50 transition-all duration-200">
                Mehr erfahren
              </Link>
            </div>

            {/* Stats */}
            <div className="animate-fade-in delay-300 flex flex-wrap gap-12 pt-8 border-t border-white/10">
              {[
                { number: "150+", label: "Teilnehmer*innen" },
                { number: "10+", label: "Module" },
                { number: "3", label: "Länder" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-bold text-white mb-1">
                    {stat.number}
                  </div>
                  <div className="text-white/50 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="animate-fade-in delay-200 relative">
              <Image
                src="/images/hero-abstract.svg"
                alt="SES Academy Programm"
                width={800}
                height={1000}
                priority
                className="w-full h-auto rounded-2xl shadow-2xl shadow-black/30"
              />
              {/* Floating quote card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl px-6 py-4 max-w-[240px]">
                <p className="text-sm text-foreground font-medium leading-snug">
                  &bdquo;Politik verstehen. Gesellschaft gestalten.&ldquo;
                </p>
                <p className="text-xs text-muted mt-1.5">SES Academy Motto</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
