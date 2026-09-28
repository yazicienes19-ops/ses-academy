import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";

export function NextEvent() {
  return (
    <section className="py-32 bg-gray-50">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="ses-eyebrow mb-6">Nächstes Modul</div>
            <h2 className="font-[family-name:var(--font-playfair)] text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              Demokratie in Europa
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ses-green text-white text-xs font-semibold w-fit">
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
            14.–15. November 2026
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <Image
              src="/images/event-abstract.svg"
              alt="Demokratie in Europa – SES Academy Modul"
              width={800}
              height={600}
              className="w-full h-auto rounded-2xl shadow-lg"
            />
            {/* Date badge */}
            <div className="absolute -top-5 -right-3 sm:-right-5 bg-white rounded-xl shadow-lg px-5 py-3 text-center">
              <span className="block font-[family-name:var(--font-playfair)] text-2xl font-bold text-ses-green leading-none">14</span>
              <span className="block text-xs font-semibold text-muted mt-1">Nov</span>
            </div>
          </div>

          {/* Content */}
          <div>
            <h3 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl font-bold text-foreground mb-5 leading-tight">
              Demokratie in Europa – Formen, Chancen und Belastungsproben
            </h3>

            <p className="text-muted text-lg mb-8 leading-relaxed">
              Demokratie ist nicht überall gleich – aber überall herausgefordert. Es geht um unterschiedliche demokratische Modelle in Europa, um Themen wie Populismus, Vertrauensverlust in Institutionen und politische Teilhabe.
            </p>

            <div className="flex flex-wrap gap-6 mb-10">
              <div className="flex items-center gap-2 text-muted text-sm">
                <Calendar className="w-5 h-5 text-ses-green" />
                <span>14.–15. November 2026</span>
              </div>
              <div className="flex items-center gap-2 text-muted text-sm">
                <MapPin className="w-5 h-5 text-ses-green" />
                <span>Köln</span>
              </div>
              <div className="flex items-center gap-2 text-muted text-sm">
                <Users className="w-5 h-5 text-ses-green" />
                <span>150 Teilnehmer*innen</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/module/4"
                className="ses-button ses-button-primary"
              >
                Details & Anmeldung
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/module"
                className="ses-button ses-button-outline"
              >
                Alle Module
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
