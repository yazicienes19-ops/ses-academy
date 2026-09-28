import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#0a2e1a] text-white">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-5">
            <Image
              src="/logos/ses-academy-white.png"
              alt="SES Academy"
              width={180}
              height={58}
              className="h-12 w-auto mb-6"
            />
            <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-sm">
              Politische Bildung für junge Muslime in Europa. Ein Projekt des Islamrats für die BRD in Kooperation mit den Jugend- und Frauenjugendorganisationen der IGMG.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-white/50 text-sm">
                <MapPin className="w-4 h-4 text-ses-green-muted" />
                <span>Colonia-Allee 3, 51067 Köln</span>
              </div>
              <div className="flex items-center gap-3 text-white/50 text-sm">
                <Mail className="w-4 h-4 text-ses-green-muted" />
                <a href="mailto:ses@islamrat.de" className="hover:text-white transition-colors">ses@islamrat.de</a>
              </div>
            </div>
          </div>

          {/* Programm */}
          <div className="lg:col-span-3">
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">Programm</h3>
            <ul className="space-y-3">
              {[{ name: "Über uns", href: "/ueber-uns" }, { name: "Module", href: "/module" }, { name: "Referenten", href: "/referenten" }, { name: "Aktuelles", href: "/aktuelles" }].map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-white/40 hover:text-white text-sm transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Mitmachen */}
          <div className="lg:col-span-4">
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">Mitmachen</h3>
            <ul className="space-y-3 mb-8">
              {[{ name: "Bewerbung", href: "/bewerbung" }, { name: "Umfragen", href: "/umfragen" }, { name: "Kontakt", href: "/kontakt" }, { name: "Impressum", href: "/impressum" }, { name: "Datenschutz", href: "/datenschutz" }].map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-white/40 hover:text-white text-sm transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">Partner</h3>
            <div className="flex items-center gap-6">
              <a href="https://www.islamrat.de/" target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Islamrat für die BRD">
                <Image src="/logos/islamrat-white.png" alt="Islamrat für die BRD" width={110} height={40} className="h-9 w-auto" />
              </a>
              <a href="https://www.igmg.de/" target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity" aria-label="IGMG">
                <Image src="/logos/igmg-white.png" alt="IGMG" width={110} height={48} className="h-10 w-auto" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} SES Academy – Ein Projekt des Islamrats für die BRD
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-white/30 hover:text-white transition-colors" aria-label="LinkedIn">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="#" className="text-white/30 hover:text-white transition-colors" aria-label="Instagram">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="#" className="text-white/30 hover:text-white transition-colors" aria-label="YouTube">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
