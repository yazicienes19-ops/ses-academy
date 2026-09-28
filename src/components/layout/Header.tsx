"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import Image from "next/image";

const navigation = [
  { name: "Über uns", href: "/ueber-uns" },
  { name: "Module", href: "/module" },
  { name: "Referenten", href: "/referenten" },
  { name: "Aktuelles", href: "/aktuelles" },
  { name: "Umfragen", href: "/umfragen" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={clsx(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled ? "bg-white/95 backdrop-blur-md shadow-[0_1px_20px_rgba(0,0,0,0.08)] py-2" : "bg-transparent py-4"
    )}>
      <nav className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={scrolled ? "/logos/ses-academy.png" : "/logos/ses-academy-white.png"}
              alt="SES Academy"
              width={140}
              height={45}
              priority
              className="h-10 w-auto transition-all duration-300"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                  scrolled 
                    ? "text-muted-strong hover:text-ses-green hover:bg-ses-green-light" 
                    : "text-white/85 hover:text-white hover:bg-white/10"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/bewerbung"
              className={clsx(
                "hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                scrolled 
                  ? "bg-ses-green text-white hover:bg-ses-green-dark" 
                  : "bg-white text-ses-green hover:bg-ses-green-light"
              )}
            >
              Bewerben
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              className={clsx(
                "lg:hidden p-2 rounded-lg transition-colors",
                scrolled ? "text-muted-strong hover:bg-gray-100" : "text-white hover:bg-white/10"
              )}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menü öffnen"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-6 mt-4 bg-white rounded-xl shadow-lg">
            <div className="flex flex-col gap-1 px-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-4 py-3 text-sm font-medium text-muted-strong hover:text-ses-green hover:bg-ses-green-light rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/bewerbung"
                className="mt-2 ses-button ses-button-primary text-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Bewerben
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
