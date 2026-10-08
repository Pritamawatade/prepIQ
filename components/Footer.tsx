import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="page-width grid gap-8 py-10 md:grid-cols-[1.2fr_.8fr_.8fr]">
        <div>
          <p className="font-display text-xl font-semibold">DocWise</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            A quiet place to work through dense material. Every answer keeps its page number.
          </p>
        </div>
        <nav aria-label="Footer navigation" className="grid content-start gap-2 text-sm">
          <p className="section-label">Index</p>
          <Link className="w-fit text-muted-foreground hover:text-foreground" href="/upload">Library</Link>
          <Link className="w-fit text-muted-foreground hover:text-foreground" href="/query">Reading room</Link>
          <Link className="w-fit text-muted-foreground hover:text-foreground" href="/history">Notes</Link>
        </nav>
        <nav aria-label="Colophon" className="grid content-start gap-2 text-sm">
          <p className="section-label">Colophon</p>
          <Link className="w-fit text-muted-foreground hover:text-foreground" href="/about">About the project</Link>
          <Link className="w-fit text-muted-foreground hover:text-foreground" href="/contact">Contact the editors</Link>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="page-width flex flex-col gap-1 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>Set in Crimson Pro and Atkinson Hyperlegible.</span>
          <span>DocWise reading room, 2026.</span>
        </div>
      </div>
    </footer>
  );
}
