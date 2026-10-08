import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="page-width flex min-h-[calc(100dvh-4rem)] items-center justify-center py-16 text-center">
      <div className="max-w-lg">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-primary"><FileQuestion className="size-7" /></span>
        <p className="mt-7 text-sm font-semibold text-primary">404 · Page not found</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">This page isn’t in your library.</h1>
        <p className="mt-4 leading-7 text-muted-foreground">The link may be out of date, or the page may have moved. Head back to DocWise and continue from there.</p>
        <Button asChild className="mt-7 gap-2"><Link href="/"><ArrowLeft className="size-4" /> Back to DocWise</Link></Button>
      </div>
    </section>
  );
}
