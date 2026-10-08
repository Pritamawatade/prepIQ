"use client";

import { useState } from "react";
import { Mail, Send, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  { q: "Which file types can I add?", a: "DocWise currently accepts PDF, DOCX, and CSV files up to 50 MB each." },
  { q: "Where do answers come from?", a: "Answers are generated from the documents you add. Source details are shown with an answer when available." },
  { q: "How do I report a problem?", a: "Use the form to prepare an email with the details. Your email app will open so you can review and send it." },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = encodeURIComponent(`DocWise message from ${name}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name} (${email})`);
    window.location.href = `mailto:hello@pdfchat.com?subject=${subject}&body=${body}`;
  }

  return (
    <div className="page-width min-h-[calc(100dvh-4rem)] py-12 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
        <section>
          <p className="section-label">Correspondence</p>
          <h1 className="page-heading mt-3">Write to the editors.</h1>
          <p className="mt-5 max-w-md leading-7 text-muted-foreground">Share a question, report an issue, or tell us what would make working with your documents easier.</p>
          <a className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted" href="mailto:hello@pdfchat.com"><Mail className="size-4 text-primary" /> hello@pdfchat.com <ExternalLink className="ml-1 size-3.5 text-muted-foreground" /></a>
          <div className="mt-12 border-t border-border pt-7"><h2 className="font-semibold">Common questions</h2><div className="mt-3 divide-y divide-border">{faqs.map((item) => <details key={item.q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">{item.q}<ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><p className="mt-3 pr-7 text-sm leading-6 text-muted-foreground">{item.a}</p></details>)}</div></div>
        </section>

        <section className="surface h-fit p-5 sm:p-8">
          <div className="flex items-start gap-3 border-b border-border pb-5"><span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary"><Mail className="size-5" /></span><div><h2 className="font-semibold">Write us a note</h2><p className="mt-1 text-sm text-muted-foreground">Your email app will open with your message ready to review.</p></div></div>
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><label htmlFor="contact-name" className="text-sm font-medium">Name</label><input id="contact-name" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Your name" /></div>
              <div className="space-y-2"><label htmlFor="contact-email" className="text-sm font-medium">Email</label><input id="contact-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="you@example.com" /></div>
            </div>
            <div className="space-y-2"><label htmlFor="contact-message" className="text-sm font-medium">Message</label><textarea id="contact-message" value={message} onChange={(event) => setMessage(event.target.value)} required rows={7} className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="How can we help?" /></div>
            <Button type="submit" className="h-11 gap-2 px-5">Prepare email <Send className="size-4" /></Button>
          </form>
        </section>
      </div>
    </div>
  );
}
