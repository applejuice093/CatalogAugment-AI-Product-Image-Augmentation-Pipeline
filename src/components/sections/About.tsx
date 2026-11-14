export function About() {
  return (
    <section id="about" className="relative z-10 bg-background px-5 py-28">
      <div className="mx-auto max-w-3xl">
        <h2 className="section-title">A pipeline for product pictures that have to survive the real world.</h2>
        <div className="mt-8 space-y-5 text-lg leading-8 text-muted-foreground">
          <p>
            CatalogAugment is for retail and e-commerce teams who start with one product photograph and need a set that still looks like that product under other light, other rooms, and other cameras.
          </p>
          <p>
            The path is upload, augment, understand, validate. This application already keeps accounts in SQL and image files on disk. Image generation and the vision-language reader are the next stages, and this page does not pretend they are running.
          </p>
        </div>
      </div>
    </section>
  );
}
