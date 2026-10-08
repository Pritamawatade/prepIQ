import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

export default async function UploadPage() {
  const { userId } = await auth();

  return (
    <section className="page-width min-h-[calc(100dvh-4rem)] py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="section-label">The library</p>
        <h1 className="page-heading mt-3">Shelve your documents</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Deposit reports and reference files. When the catalogue is ready, the reading room will open.</p>
        {userId ? (
          <div className="surface mt-9 overflow-hidden">
            <div className="border-b border-border px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary"><FileText className="size-5" /></span>
                <div><h2 className="font-display text-lg font-semibold">Choose your files</h2><p className="mt-0.5 text-sm text-muted-foreground">PDF, DOCX, or CSV · Up to 50 MB each</p></div>
              </div>
            </div>
            <div className="p-4 sm:p-7"><FileUpload /></div>
            <div className="flex items-center gap-2 border-t border-border bg-background/70 px-5 py-3 text-xs text-muted-foreground sm:px-7"><ShieldCheck className="size-4" style={{ color: "var(--brass)" }} /> Shelved under your account, visible only to you.</div>
          </div>
        ) : (
          <div className="surface mt-9 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div><h2 className="font-semibold">Sign in to add documents</h2><p className="mt-1 text-sm text-muted-foreground">Your library and conversations are saved to your account.</p></div>
            <SignInButton mode="modal"><Button>Sign in to continue</Button></SignInButton>
          </div>
        )}
        <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <p className="flex items-center gap-3"><span className="font-display text-lg text-muted-foreground">I</span> Select up to 10 files</p>
          <p className="flex items-center gap-3"><span className="font-display text-lg text-muted-foreground">II</span> Wait while they are catalogued</p>
          <p className="flex items-center gap-3"><span className="font-display text-lg text-muted-foreground">III</span> Ask in the reading room</p>
        </div>
      </div>
    </section>
  );
}
