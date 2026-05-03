import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

export function SignaturePad({ onSave, width = 500, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return ctx;
  }, []);

  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [getCtx, width, height]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    setDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDraw = () => setDrawing(false);

  const clear = () => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasContent(false);
  };

  const save = () => {
    if (!hasContent || !canvasRef.current) return;
    onSave(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Draw your signature below</p>
      <div className="rounded-lg border-2 border-dashed border-border bg-white overflow-hidden touch-none" style={{ maxWidth: width }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair"
          style={{ aspectRatio: `${width}/${height}` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} className="gap-1.5">
          <Eraser className="h-3.5 w-3.5" /> Clear
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={!hasContent} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          Accept & Sign
        </Button>
      </div>
    </div>
  );
}
