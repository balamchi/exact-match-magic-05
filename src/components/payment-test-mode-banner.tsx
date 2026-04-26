import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;

  return (
    <div className="w-full border-b border-orange-500/30 bg-orange-500/10 px-4 py-2 text-center text-xs text-orange-300">
      All payments in the preview are in <strong>test mode</strong>. Use card{" "}
      <code className="rounded bg-orange-500/20 px-1.5 py-0.5">4242 4242 4242 4242</code> · any future expiry · CVC{" "}
      <code className="rounded bg-orange-500/20 px-1.5 py-0.5">123</code>.
    </div>
  );
}
