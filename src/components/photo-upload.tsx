import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PhotoUploadProps {
  bucket: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
  /** "square" = rounded-xl, "circle" = rounded-full */
  shape?: "square" | "circle";
  /** px */
  size?: number;
  placeholder?: React.ReactNode;
  hint?: string;
  clinicId: string;
}

export function PhotoUpload({
  bucket, currentUrl, onUploaded, onRemoved,
  shape = "square", size = 96, placeholder, hint, clinicId,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large — max 5 MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP are accepted");
      return;
    }

    setUploading(true);
    setProgress(10);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${clinicId}/${crypto.randomUUID()}.${ext}`;

    setProgress(30);

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    setProgress(80);

    if (error) {
      toast.error(error.message);
      setUploading(false);
      setProgress(0);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    setProgress(100);

    setTimeout(() => {
      onUploaded(urlData.publicUrl);
      setUploading(false);
      setProgress(0);
    }, 300);
  }, [bucket, clinicId, onUploaded]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  const isCircle = shape === "circle";

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />

      {currentUrl ? (
        <div className="relative group inline-block" style={{ width: size, height: size }}>
          <img
            src={currentUrl}
            alt="Photo"
            className={cn(
              "object-cover border border-border/60",
              isCircle ? "rounded-full" : "rounded-xl",
            )}
            style={{ width: size, height: size }}
          />
          <div className={cn(
            "absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 opacity-0 transition group-hover:opacity-100",
            isCircle ? "rounded-full" : "rounded-xl",
          )}>
            <Button aria-label="Action"
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button aria-label="Action"
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={onRemoved}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-border/60 text-muted-foreground transition hover:border-primary/40 hover:text-primary",
            isCircle ? "rounded-full" : "rounded-xl",
          )}
          style={{ width: size, height: size }}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : placeholder ? (
            placeholder
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="text-[10px] font-medium">Upload</span>
            </>
          )}
        </button>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40" style={{ maxWidth: size }}>
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {hint && !currentUrl && !uploading && (
        <p className="text-[10px] text-muted-foreground" style={{ maxWidth: size * 2 }}>{hint}</p>
      )}
    </div>
  );
}
