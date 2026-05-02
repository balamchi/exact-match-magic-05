import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact — ClinicPro" },
      { name: "description", content: "Get in touch with the ClinicPro team. We're here to help you get started." },
      { property: "og:title", content: "Contact — ClinicPro" },
      { property: "og:description", content: "Talk to the ClinicPro team." },
    ],
  }),
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setSubmitted(true);
    toast.success("Message sent! We'll be in touch within 24 hours.");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-xl font-bold bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
            ClinicPro
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</Link>
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground">About</Link>
            <Link to="/contact" className="text-sm font-medium text-primary">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm" className="bg-gradient-primary shadow-glow">Start free trial</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          {/* Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Contact Us</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
              Let's talk about{" "}
              <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">your clinic</span>
            </h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Whether you're exploring ClinicPro for the first time or need help with your account, our team is here. 
              Most inquiries get a response within 4 hours during business hours.
            </p>

            <div className="mt-10 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Email</p>
                  <p className="text-sm text-muted-foreground">hello@clinicpro.io</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Phone</p>
                  <p className="text-sm text-muted-foreground">+1 (888) 555-CPRO</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Office</p>
                  <p className="text-sm text-muted-foreground">Toronto, ON · Vancouver, BC</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-border/50 bg-card/60 p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-4" />
                <h2 className="text-xl font-semibold">Message sent!</h2>
                <p className="mt-2 text-muted-foreground">We'll get back to you within 24 hours.</p>
                <Button variant="outline" className="mt-6" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First name</Label>
                    <Input required placeholder="Jane" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input required placeholder="Smith" className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input required type="email" placeholder="jane@clinic.com" className="mt-1.5" />
                </div>
                <div>
                  <Label>Clinic name</Label>
                  <Input placeholder="Your clinic (optional)" className="mt-1.5" />
                </div>
                <div>
                  <Label>How can we help?</Label>
                  <Textarea required placeholder="Tell us about your clinic and what you're looking for…" rows={5} className="mt-1.5 resize-none" />
                </div>
                <Button type="submit" disabled={sending} className="w-full bg-gradient-primary shadow-glow gap-2">
                  <Send className="h-4 w-4" />
                  {sending ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
