import { Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  children: React.ReactNode;
}

export function PlaceholderPage({ title, children }: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg [background:linear-gradient(135deg,#9333EA,#D946EF)] shadow-glow">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-semibold">ClinicPro</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </nav>
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
        <div className="mt-8 text-lg leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
