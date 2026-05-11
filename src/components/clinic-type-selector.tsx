import { useEffect, useMemo, useState } from "react";
import {
  Syringe,
  Scissors,
  Stethoscope,
  Microscope,
  HeartPulse,
  Check,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ClinicTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedCategories: string[]) => Promise<void>;
  isLoading?: boolean;
}

const ICONS: Record<string, LucideIcon> = {
  Syringe,
  Scissors,
  Stethoscope,
  Microscope,
  HeartPulse,
};

const CLINIC_TYPES = [
  {
    id: "medical_aesthetic",
    name: "Medical Aesthetic / Med Spa",
    description: "Injectables, lasers, skin treatments, body contouring, PMU",
    icon: "Syringe",
    estimatedServices: 132,
    categories: ["Injectables", "Laser & Energy", "Skin Treatments", "Body Contouring", "PMU"],
  },
  {
    id: "beauty_salon",
    name: "Beauty Salon",
    description: "Hair, nails, lashes, brows, waxing",
    icon: "Scissors",
    estimatedServices: 82,
    categories: ["Hair", "Nails", "Lash, Brow & Wax"],
  },
  {
    id: "dental",
    name: "Dental",
    description: "Preventive, restorative, cosmetic, surgical",
    icon: "Stethoscope",
    estimatedServices: 44,
    categories: ["Dental — Preventive", "Dental — Restorative", "Dental — Cosmetic", "Dental — Surgical"],
  },
  {
    id: "dermatology",
    name: "Dermatology",
    description: "Medical skin care, mole removal, biopsies",
    icon: "Microscope",
    estimatedServices: 30,
    categories: ["Dermatology"],
  },
  {
    id: "wellness",
    name: "Wellness",
    description: "Physio, chiro, massage, acupuncture, holistic",
    icon: "HeartPulse",
    estimatedServices: 35,
    categories: ["Physio & Chiro", "Massage", "Holistic & Wellness"],
  },
];

const CATEGORY_SERVICE_COUNTS: Record<string, number> = {
  "Injectables": 30,
  "Laser & Energy": 25,
  "Skin Treatments": 30,
  "Body Contouring": 27,
  "PMU": 19,
  "Hair": 31,
  "Nails": 20,
  "Lash, Brow & Wax": 31,
  "Dental — Preventive": 9,
  "Dental — Restorative": 13,
  "Dental — Cosmetic": 10,
  "Dental — Surgical": 12,
  "Dermatology": 30,
  "Physio & Chiro": 10,
  "Massage": 12,
  "Holistic & Wellness": 13,
};

export function ClinicTypeSelector({ open, onOpenChange, onConfirm, isLoading }: ClinicTypeSelectorProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedTypes([]);
      setSelectedCategories([]);
    }
  }, [open]);

  const toggleType = (id: string) => {
    setSelectedTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const handleContinue = () => {
    const cats = CLINIC_TYPES.filter((t) => selectedTypes.includes(t.id)).flatMap((t) => t.categories);
    setSelectedCategories(Array.from(new Set(cats)));
    setStep(2);
  };

  const totalCount = useMemo(
    () => selectedCategories.reduce((sum, c) => sum + (CATEGORY_SERVICE_COUNTS[c] ?? 0), 0),
    [selectedCategories],
  );

  const selectedTypeObjects = CLINIC_TYPES.filter((t) => selectedTypes.includes(t.id));

  return (
    <Dialog open={open} onOpenChange={isLoading ? () => {} : onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl sm:text-3xl">What kind of clinic do you run?</DialogTitle>
              <DialogDescription>Pick all that apply — you can change this later</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-1 mt-4">
              {CLINIC_TYPES.map((type) => {
                const Icon = ICONS[type.icon];
                const selected = selectedTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleType(type.id)}
                    className={cn(
                      "relative text-left rounded-2xl border-2 p-5 transition-all duration-200",
                      selected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    <span className="absolute right-4 top-4 inline-flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        ~{type.estimatedServices} services
                      </span>
                      {selected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </span>
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                        selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {Icon && <Icon size={24} />}
                      </div>
                      <div className="flex-1 pr-24">
                        <h3 className="font-semibold">{type.name}</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <Button
                onClick={handleContinue}
                disabled={selectedTypes.length === 0}
                className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-fuchsia-600 text-primary-foreground shadow-glow hover:opacity-90"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => onConfirm([])}
                disabled={isLoading}
                className="text-xs text-muted-foreground hover:text-foreground transition disabled:opacity-50"
              >
                {isLoading ? "Loading…" : "Skip — load everything (293 services)"}
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl sm:text-3xl">Great! Which services do you offer?</DialogTitle>
              <DialogDescription>
                Uncheck anything you don't do. We'll only load what you need.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-4">
              {selectedTypeObjects.map((type) => (
                <div key={type.id} className="rounded-2xl border border-border bg-card p-4">
                  <h4 className="mb-3 text-sm font-semibold text-foreground">{type.name}</h4>
                  <div className="space-y-2">
                    {type.categories.map((cat) => {
                      const checked = selectedCategories.includes(cat);
                      return (
                        <label
                          key={cat}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-lg px-3 py-2 cursor-pointer transition",
                            checked ? "bg-primary/5" : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={checked} onCheckedChange={() => toggleCategory(cat)} />
                            <span className="text-sm">{cat}</span>
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {CATEGORY_SERVICE_COUNTS[cat] ?? 0} services
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <p className="text-center text-sm text-muted-foreground">
                <Sparkles className="inline h-3.5 w-3.5 mr-1 text-primary" />
                Loading <strong className="text-foreground">{totalCount}</strong> services
              </p>
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" onClick={() => setStep(1)} disabled={isLoading} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => onConfirm(selectedCategories)}
                  disabled={selectedCategories.length === 0 || isLoading}
                  className="gap-2 bg-gradient-to-r from-primary to-fuchsia-600 text-primary-foreground shadow-glow hover:opacity-90"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
                  ) : (
                    <>Load {totalCount} services <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
