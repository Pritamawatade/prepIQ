import Link from "next/link";
import { ArrowRight, Github, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const team = [
  { name: "Pritam Awatade", role: "Team lead · Full stack", detail: "Product direction, Next.js, React, and system architecture.", github: "https://github.com/pritamawatade", email: "pritamawatade.work@gmail.com" },
  { name: "Aman", role: "Backend · AI integration", detail: "Backend services, APIs, and the document question-answering flow.", github: "https://github.com/pritamawatade", email: "aman@example.com" },
  { name: "Ved", role: "Frontend · Interaction design", detail: "Interface development and the details that make the workflow clear.", github: "https://github.com/pritamawatade", email: "ved@example.com" },
  { name: "Amul", role: "Infrastructure · Data", detail: "Deployment, database operations, and the systems behind the app.", github: "https://github.com/pritamawatade", email: "amul@example.com" },
];

const stack = ["Next.js", "React", "Supabase", "OpenAI", "Tailwind CSS", "Qdrant"];

export default function AboutPage() {
  return (
    <div className="page-width">
      <section className="grid gap-10 border-b border-border py-16 md:grid-cols-[.8fr_1.2fr] md:py-24">
        <div><p className="section-label">About DocWise</p><h1 className="page-heading mt-4">A better way to get through the reading.</h1></div>
        <div className="max-w-2xl self-end"><p className="text-lg leading-8 text-muted-foreground">DocWise turns a pile of documents into a place you can ask clear questions and follow every answer back to its source.</p><div className="mt-7 flex flex-wrap gap-3"><Button asChild><Link href="/upload">Try DocWise <ArrowRight className="ml-2 size-4" /></Link></Button><Button asChild variant="outline"><Link href="/contact">Contact the team</Link></Button></div></div>
      </section>

      <section className="grid gap-8 py-14 md:grid-cols-2 md:gap-14 md:py-20">
        <div className="flex items-start gap-4"><span className="font-display flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-lg text-muted-foreground">§</span><div><h2 className="font-display text-xl font-semibold">Our aim</h2><p className="mt-3 leading-7 text-muted-foreground">Make dense information easier to navigate without hiding the context. A useful answer should point you toward the original passage, not ask you to take it on faith.</p></div></div>
        <div className="flex items-start gap-4"><span className="font-display flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-lg text-muted-foreground">¶</span><div><h2 className="font-display text-xl font-semibold">How it works</h2><p className="mt-3 leading-7 text-muted-foreground">Add your files, ask a question in everyday language, then use the source details to check and continue your research.</p></div></div>
      </section>

      <section className="border-t border-border py-14 md:py-18">
        <div className="mb-7 flex items-end justify-between gap-4"><div><p className="section-label">The people behind it</p><h2 className="font-display mt-2 text-2xl font-semibold">Meet the editors</h2></div><Users className="size-5 text-muted-foreground" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {team.map((member) => <article key={member.name} className="surface p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{member.name}</h3><p className="mt-1 text-sm text-primary">{member.role}</p></div><span className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">{member.name.slice(0, 1)}</span></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{member.detail}</p><div className="mt-4 flex gap-2"><a className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground" href={member.github} target="_blank" rel="noreferrer" aria-label={`${member.name} GitHub`}><Github className="size-4" /></a><a className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground" href={`mailto:${member.email}`} aria-label={`Email ${member.name}`}><Mail className="size-4" /></a></div></article>)}
        </div>
      </section>

      <section className="mb-14 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="font-semibold">Built with</h2><p className="mt-1 text-sm text-muted-foreground">The tools that power the DocWise workflow.</p>
        <div className="mt-5 flex flex-wrap gap-2">{stack.map((name) => <span key={name} className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground">{name}</span>)}</div>
      </section>
    </div>
  );
}
