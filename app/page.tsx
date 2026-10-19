"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  FileSpreadsheet,
  FileText,
  Files,
  GitCompareArrows,
  Languages,
  Quote,
  ScanSearch,
  ShieldCheck,
  Table2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

const revenue = [
  { q: "Q1", value: 42 },
  { q: "Q2", value: 55 },
  { q: "Q3", value: 51 },
  { q: "Q4", value: 68 },
];

const topics = [
  { t: "Renewals", v: 38 },
  { t: "New biz", v: 27 },
  { t: "Expansion", v: 21 },
  { t: "Other", v: 14 },
];
const topicColors = ["#0d5c55", "#d97706", "#84a98c", "#94a3b8"];

const trend = [
  { m: "Jan", pages: 12 },
  { m: "Feb", pages: 19 },
  { m: "Mar", pages: 17 },
  { m: "Apr", pages: 28 },
  { m: "May", pages: 34 },
  { m: "Jun", pages: 41 },
];

const tabs = [
  {
    id: "summarize",
    label: "Summarize",
    icon: BookOpen,
    question: "Summarize this 80-page board pack in 5 bullets.",
    answer:
      "Revenue up 12% QoQ on enterprise renewals. Churn fell to 3.1%. Hiring freezes lifted in support. Two risks flagged: concentration in top 5 accounts and delayed APAC launch.",
    cite: "Board pack.pdf, pp. 4–9",
  },
  {
    id: "compare",
    label: "Compare",
    icon: GitCompareArrows,
    question: "How does Q3 differ from Q2 on pricing?",
    answer:
      "Q3 holds list price but expands discount bands from 8% to 12% for annual prepay. Q2 discounted only at close. Net effect: 2pt margin give-back, offset by volume.",
    cite: "Q2 review p. 11 · Q3 review p. 14",
  },
  {
    id: "numbers",
    label: "Extract numbers",
    icon: Table2,
    question: "Pull quarterly revenue into a table.",
    answer:
      "Done  4 quarters extracted below. Q4 leads at $68M. Ask me to chart it, or export the rows to CSV.",
    cite: "Annual report.xlsx, sheet Revenue",
  },
] as const;

const features = [
  {
    icon: ScanSearch,
    title: "Page-level citations",
    body: "Every claim ships with file and page. Click the stamp and you land on the exact passage  no blind trust.",
    span: "md:col-span-2",
    visual: "cite" as const,
  },
  {
    icon: BarChart3,
    title: "Tables become charts",
    body: "Numbers buried in PDFs surface as bars, lines, and exportable tables.",
    span: "",
    visual: "mini" as const,
  },
  {
    icon: Files,
    title: "Ask across 10 files",
    body: "Compare versions, reconcile figures, and spot what changed between drafts without opening eleven tabs.",
    span: "",
    visual: "none",
  },
  {
    icon: Languages,
    title: "Reads scans and tables",
    body: "PDFs, DOCX, and CSV  including exported sheets and messy real-world formatting.",
    span: "",
    visual: "none",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Your shelf is scoped to your account. Delete a file and its vectors leave with it.",
    span: "",
    visual: "none",
  },
  {
    icon: Zap,
    title: "38-second median answer",
    body: "Retrieval plus generation, timed on a 120-page pack. Long docs stay snappy.",
    span: "md:col-span-2",
    visual: "speed" as const,
  },
];

const steps = [
  {
    n: "01",
    title: "Drop the pile",
    body: "Drag in PDFs, DOCX, and CSVs  up to 10 files, 50 MB each. We paginate, chunk, and index while you watch the progress bar fill.",
    meta: "PDF · DOCX · CSV",
  },
  {
    n: "02",
    title: "Interrogate it",
    body: "Summarize, compare, extract. Follow-ups keep context, so “and what about APAC?” just works.",
    meta: "Natural language",
  },
  {
    n: "03",
    title: "Verify and export",
    body: "Check the margin note, open the page, copy with citations, or export the table to CSV for your model.",
    meta: "Cite · Copy · Export",
  },
];

const personas = [
  {
    quote: " diligence used to mean four analysts and a weekend. Now I ask the data room directly and still get page numbers for the memo.",
    name: "Mira K.",
    role: "Investor, early-stage fund",
  },
  {
    quote: "I fed it three years of field reports. It found the one paragraph where we promised the opposite  with the page attached.",
    name: "Daniel O.",
    role: "Policy researcher",
  },
  {
    quote: "Thesis literature review went from dread to almost fun. Summaries in the morning, charts by lunch, citations by dinner.",
    name: "Sara P.",
    role: "Masters student",
  },
];

const faqs = [
  {
    q: "What files can I upload?",
    a: "PDF, DOCX, and CSV  up to 10 files at once, 50 MB each. Scanned PDFs work; tables inside spreadsheets are parsed row by row.",
  },
  {
    q: "Where do answers come from?",
    a: "Only from the documents you shelve. Each answer carries file and page references so you can audit it in seconds.",
  },
  {
    q: "Can it make charts from my data?",
    a: "Yes. When your question implies numbers  revenue by quarter, headcount by region  DocWise extracts the rows and renders a chart you can inspect and export.",
  },
  {
    q: "Is my data private?",
    a: "Your library is scoped to your signed-in account. Delete a file and its embeddings are removed. We never train on your uploads.",
  },
];

export default function Home() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("summarize");
  const active = tabs.find((t) => t.id === tab)!;

  return (
    <div className="overflow-x-clip">
      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative border-b border-border bg-background">
        <div className="page-width relative grid gap-12 pb-16 pt-14 md:grid-cols-[1fr_1.05fr] md:pt-24">
          <div>
            <p className="section-label">DocWise reading room</p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="font-display mt-4 text-[clamp(2.6rem,5.4vw,4.4rem)] font-semibold leading-[1.02]"
            >
              Chat with your documents. Cite every line.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground"
            >
              Drop in board packs, papers, and spreadsheets. Ask in plain words and get
              a direct answer  with the file and page waiting in the margin so you
              can verify before you quote.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <SignedOut>
                <SignInButton mode="modal">
                  <Button size="lg" className="h-12 gap-2 px-6 text-base">
                    Start reading free <ArrowRight className="size-4" />
                  </Button>
                </SignInButton>
                <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
                  <Link href="/about">See how it reads</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button asChild size="lg" className="h-12 gap-2 px-6 text-base">
                  <Link href="/upload">Shelve documents <ArrowRight className="size-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
                  <Link href="/query">Open reading room</Link>
                </Button>
              </SignedIn>
            </motion.div>
            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.34 }}
              className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-border pt-6"
            >
              {[
                ["180k+", "pages read"],
                ["38s", "median answer"],
                ["4.9/5", "reader rating"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-3xl font-semibold">{v}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{l}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Hero composition */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative mx-auto w-full max-w-[560px]"
          >
            <div className="surface relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                    <FileText className="size-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">Board pack.pdf</p>
                    <p className="text-xs text-muted-foreground">84 pages · indexed</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">
                  <span className="inline-flex size-2 rounded-full bg-primary" />
                  Live
                </span>
              </div>
              <div className="space-y-4 p-5">
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  Why did churn drop in Q3?
                </div>
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3 text-sm leading-6">
                  Churn fell to <strong>3.1%</strong> after onboarding was cut from 9 to
                  4 days. Support tickets per account dropped 22%.
                  <div className="mt-3">
                    <span className="source-stamp">Board pack, p. 23</span>
                  </div>
                </div>
                {/* Inline bar crop */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold">Churn by quarter</span>
                    <span className="text-muted-foreground">auto-charted</span>
                  </div>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenue} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="q" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 2, 2]}>
                          {revenue.map((_, i) => (
                            <Cell key={i} fill={i === 3 ? "var(--glow)" : "var(--primary)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Static reference crops */}
            <div className="absolute -left-4 top-16 hidden w-44 -rotate-2 rounded-xl border border-border bg-card p-3 shadow-lg sm:block">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <FileSpreadsheet className="size-4 text-primary" /> Revenue.xlsx
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full w-4/5 rounded-full bg-primary" /></div>
              <p className="mt-2 text-[11px] text-muted-foreground">4 quarters parsed</p>
            </div>
            <div className="absolute -right-3 bottom-10 hidden w-48 rotate-2 rounded-xl border border-border bg-card p-3 shadow-lg sm:block">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Check className="size-4" style={{ color: "var(--glow)" }} /> Verified passage
              </div>
              <p className="mt-1.5 font-display text-sm italic leading-5">“…renewals contributing most…”</p>
              <p className="mt-1 text-[11px] text-muted-foreground">p. 8 · exact match</p>
            </div>
          </motion.div>
        </div>

        {/* Marquee */}
        <div className="border-y border-border bg-card/70 py-3.5">
          <div className="page-width overflow-hidden">
            <div className="animate-marquee flex w-max items-center gap-10 text-sm font-medium text-muted-foreground">
              {[0, 1].map((k) => (
                <div key={k} className="flex items-center gap-10" aria-hidden={k === 1}>
                  <span className="inline-flex items-center gap-2"><FileText className="size-4" /> PDF reports</span>
                  <span className="inline-flex items-center gap-2"><BookOpen className="size-4" /> DOCX manuscripts</span>
                  <span className="inline-flex items-center gap-2"><Table2 className="size-4" /> CSV tables</span>
                  <span className="inline-flex items-center gap-2"><GitCompareArrows className="size-4" /> Version compare</span>
                  <span className="inline-flex items-center gap-2"><BarChart3 className="size-4" /> Auto charts</span>
                  <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4" /> Private shelf</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE DEMO ─────────────────────── */}
      <section className="page-width py-16 md:py-24">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="section-label">Try the shape of it</p>
          <h2 className="font-display mt-4 text-3xl font-semibold md:text-4xl">One shelf, three kinds of questions</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Summaries for the skim, comparisons for the audit, tables for the model.
            Pick a tab  this is the actual rhythm of the reading room.
          </p>
        </motion.div>
        <motion.div {...fadeUp} className="surface mt-8 overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-border bg-muted/40 p-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
                  tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </div>
          <div className="grid gap-0 md:grid-cols-[1fr_1fr]">
            <div className="border-b border-border p-6 md:border-b-0 md:border-r md:p-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You ask</p>
              <p className="font-display mt-2 text-2xl leading-snug">{active.question}</p>
              <div className="mt-6 rounded-xl bg-primary p-4 text-sm leading-6 text-primary-foreground">
                {active.answer}
              </div>
              <p className="mt-4"><span className="source-stamp">{active.cite}</span></p>
            </div>
            <div className="bg-card p-6 md:p-8">
              {tab === "numbers" ? (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Extracted revenue</p>
                    <span className="text-xs text-muted-foreground">from Annual report.xlsx</span>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                        <tr><th className="px-3 py-2">Quarter</th><th className="px-3 py-2">Revenue ($M)</th><th className="px-3 py-2">Note</th></tr>
                      </thead>
                      <tbody>
                        {[["Q1", "42", "baseline"], ["Q2", "55", "+31%"], ["Q3", "51", "seasonal dip"], ["Q4", "68", "record"]].map((r) => (
                          <tr key={r[0]} className="border-t border-border">
                            <td className="px-3 py-2 font-semibold">{r[0]}</td>
                            <td className="px-3 py-2">{r[1]}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r[2]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenue} margin={{ top: 6, right: 8, bottom: 0, left: -14 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="q" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                        <Line type="monotone" dataKey="value" stroke="var(--glow)" strokeWidth={3} dot={{ fill: "var(--glow)", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold">How the room found it</p>
                  <ol className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                    <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">1</span> Retrieved 6 passages across 2 files, ranked by exact phrase overlap.</li>
                    <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">2</span> Drafted the answer only from those passages  nothing from memory.</li>
                    <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">3</span> Pinned the margin note so you can open page 8 yourself.</li>
                  </ol>
                  <div className="mt-5 rounded-xl border border-border bg-background p-4">
                    <svg viewBox="0 0 300 60" className="w-full" aria-hidden>
                      <rect x="4" y="8" width="70" height="44" rx="8" fill="var(--secondary)" />
                      <rect x="82" y="8" width="70" height="44" rx="8" fill="var(--secondary)" />
                      <rect x="160" y="8" width="70" height="44" rx="8" fill="var(--primary)" />
                      <path d="M74 30 H82 M152 30 H160 M230 30 H244" stroke="var(--glow)" strokeWidth="2.5" strokeDasharray="5 4" />
                      <rect x="244" y="8" width="52" height="44" rx="8" fill="none" stroke="var(--glow)" strokeWidth="2" strokeDasharray="6 4" />
                    </svg>
                    <p className="mt-2 text-xs text-muted-foreground">Retrieve → draft → pin the source. Nothing else touches the answer.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── BENTO FEATURES ───────────────────────── */}
      <section className="border-y border-border bg-card/50 py-16 md:py-24">
        <div className="page-width">
          <motion.div {...fadeUp} className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="section-label">Why readers stay</p>
              <h2 className="font-display mt-4 text-3xl font-semibold md:text-4xl">Serious reading needs serious receipts</h2>
            </div>
            <Button asChild variant="outline"><Link href="/upload">Shelve your first file <ArrowUpRight className="size-4" /></Link></Button>
          </motion.div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {features.map((f) => (
              <article
                key={f.title}
                className={`surface p-6 ${f.span}`}
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="font-display mt-4 text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-7 text-muted-foreground">{f.body}</p>
                {f.visual === "cite" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="source-stamp">Q3 review, p. 14</span>
                    <span className="source-stamp">Notes.csv, row 88</span>
                    <span className="source-stamp">Transcript, p. 2</span>
                  </div>
                )}
                {f.visual === "mini" && (
                  <div className="mt-4 flex items-end gap-1.5" aria-hidden>
                    {[38, 62, 45, 80, 58, 92, 70].map((h, j) => (
                      <span
                        key={j}
                        className="w-full rounded-sm"
                        style={{ height: `${h * 0.6}px`, background: j === 5 ? "var(--glow)" : "var(--primary)", opacity: j === 5 ? 1 : 0.75 }}
                      />
                    ))}
                  </div>
                )}
                {f.visual === "speed" && (
                  <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-[92%] rounded-full bg-primary" />
                    </div>
                    <span className="font-semibold text-foreground">38s</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHARTS / DATA ────────────────────────── */}
      <section className="page-width grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <motion.div {...fadeUp}>
          <p className="section-label">From tables to visuals</p>
          <h2 className="font-display mt-4 text-3xl font-semibold md:text-4xl">Your CSV already knows the chart. We just draw it.</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Ask “revenue by quarter” or “headcount by region” and DocWise pulls the
            rows, totals them where it should, and renders a chart you can hover,
            question, and export. Below is live output from a sample annual report 
            rendered in your current theme.
          </p>
          <ul className="mt-6 space-y-3 text-[0.95rem]">
            {["Hover any bar for the exact figure and its source cell", "Ask a follow-up  “now as a share of total”  and it re-cuts", "Export the extracted rows to CSV in one click"].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <Check className="mt-1 size-4 shrink-0 text-primary" /> <span>{t}</span>
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div {...fadeUp} className="grid gap-4">
          <div className="surface p-5">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold">Revenue mix, $M</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Table2 className="size-3.5" /> auto-extracted</span>
            </div>
            <div className="mt-2 h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topics} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="t" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                  <Bar dataKey="v" radius={[4, 8, 8, 4]}>
                    {topics.map((_, i) => (
                      <Cell key={i} fill={topicColors[i % topicColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="surface p-5">
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold">Pages read per month</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><BarChart3 className="size-3.5" /> your shelf, live</span>
            </div>
            <div className="mt-2 h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="pages" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── WORKFLOW ─────────────────────────────── */}
      <section className="border-y border-border bg-card/50 py-16 md:py-24">
        <div className="page-width">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="section-label">The workflow</p>
            <h2 className="font-display mt-4 text-3xl font-semibold md:text-4xl">Three moves, two minutes</h2>
          </motion.div>
          <svg viewBox="0 0 800 24" aria-hidden className="mt-8 hidden w-full md:block">
            <line x1="20" y1="12" x2="780" y2="12" stroke="var(--border)" strokeWidth="2" strokeDasharray="8 8" />
            {[20, 400, 780].map((x) => (
              <g key={x}>
                <circle cx={x} cy="12" r="8" fill="var(--primary)" />
                <circle cx={x} cy="12" r="3" fill="var(--primary-foreground)" />
              </g>
            ))}
          </svg>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.article key={s.n} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.08 }} className="surface p-6">
                <p className="font-display text-4xl font-semibold text-primary/90">{s.n}</p>
                <h3 className="font-display mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-7 text-muted-foreground">{s.body}</p>
                <p className="mt-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{s.meta}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── PERSONAS + FAQ ───────────────────────── */}
      <section className="page-width grid gap-12 py-16 md:grid-cols-[1fr_1fr] md:py-24">
        <motion.div {...fadeUp}>
          <p className="section-label">Loved by careful readers</p>
          <h2 className="font-display mt-4 text-3xl font-semibold">People who cite things for a living</h2>
          <div className="mt-8 space-y-4">
            {personas.map((p) => (
              <figure key={p.name} className="surface p-6">
                <Quote className="size-5" style={{ color: "var(--glow)" }} />
                <blockquote className="font-display mt-3 text-lg leading-7">“{p.quote}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-muted-foreground">  {p.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </motion.div>
        <motion.div {...fadeUp}>
          <p className="section-label">Questions, answered</p>
          <h2 className="font-display mt-4 text-3xl font-semibold">Before you shelve anything</h2>
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-lg leading-none text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 pr-8 text-[0.95rem] leading-7 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="surface mt-6 flex items-center gap-4 p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <ShieldCheck className="size-5 text-primary" />
            </span>
            <p className="text-sm leading-6 text-muted-foreground">
              <span className="font-semibold text-foreground">Private by design.</span> Scoped to your
              account, deletable any time, never used for training.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── FINAL CTA ────────────────────────────── */}
      <section className="page-width pb-20">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl border border-border px-6 py-14 text-center md:px-12 md:py-20"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, #083f3a 60%, #0a1413 100%)" }}
        >
          <div className="dot-grid absolute inset-0 opacity-20" aria-hidden />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-100/80">The shelf is open</p>
            <h2 className="font-display mx-auto mt-4 max-w-2xl text-3xl font-semibold leading-tight text-white md:text-5xl">
              Bring the pile. Leave with the paragraph.
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-teal-50/80">
              Free to start. Upload your first report and ask your first real question
              in under two minutes  citations included.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button size="lg" className="h-12 bg-white px-7 text-base text-teal-950 hover:bg-teal-50">
                    Start reading free <ArrowRight className="size-4" />
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Button asChild size="lg" className="h-12 bg-white px-7 text-base text-teal-950 hover:bg-teal-50">
                  <Link href="/upload">Shelve documents <ArrowRight className="size-4" /></Link>
                </Button>
              </SignedIn>
              <Button asChild variant="outline" size="lg" className="h-12 border-white/30 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white">
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-teal-100/60">PDF · DOCX · CSV  no credit card, delete anytime</p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
