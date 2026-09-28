export function Quote() {
  return (
    <section className="py-32 bg-white">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="max-w-4xl">
          <blockquote className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl md:text-[2.25rem] text-foreground leading-[1.4] mb-12">
            &bdquo;Die SES Academy gibt jungen Musliminnen und Muslimen die Möglichkeit, in Zeiten sich überschlagender politischer, sozialer und wirtschaftlicher Entwicklungen diese Vorgänge gut einordnen zu können – und sie dazu zu befähigen, sich mitgestaltend einzubringen.&ldquo;
          </blockquote>

          <div className="flex items-center gap-4 pt-8 border-t border-border">
            <div className="w-14 h-14 rounded-full bg-ses-green flex items-center justify-center text-white font-bold">
              BK
            </div>
            <div>
              <div className="font-semibold text-foreground">Burhan Kesici</div>
              <div className="text-muted text-sm">Vorsitzender, Islamrat für die Bundesrepublik Deutschland</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
