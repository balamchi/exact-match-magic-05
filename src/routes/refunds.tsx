import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy — ClinicPro" },
      { name: "description", content: "ClinicPro's 30-day money-back guarantee and refund process." },
      { property: "og:title", content: "Refund Policy — ClinicPro" },
      { property: "og:description", content: "30-day money-back guarantee. Refunds processed by Paddle." },
    ],
  }),
  component: RefundPolicy,
});

function RefundPolicy() {
  return (
    <LegalPage title="Refund Policy" updated="April 26, 2026">
      <p>
        ClinicPro is operated by <strong>Divan Group</strong>. We want you to be
        confident in your purchase, so we offer a clear, fair refund policy.
      </p>

      <h2>30-Day Money-Back Guarantee</h2>
      <p>
        If you're not satisfied with ClinicPro for any reason, you can request a full refund
        within <strong>30 days</strong> of your initial purchase or any subsequent renewal
        charge. This applies to all paid subscription plans.
      </p>

      <h2>How to Request a Refund</h2>
      <p>
        Refunds are processed by our payment provider and Merchant of Record,
        {" "}<strong>Paddle.com</strong>. To request a refund, you have two options:
      </p>
      <ul>
        <li>
          Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a>,
          look up your order using the email address you used at checkout, and submit a
          refund request directly through Paddle's buyer portal.
        </li>
        <li>
          Or contact us at <a href="mailto:support@clinicpro.io">support@clinicpro.io</a> with
          your order details and we'll forward your request to Paddle on your behalf.
        </li>
      </ul>

      <h2>Processing Time</h2>
      <p>
        Approved refunds are typically issued to your original payment method within
        5–10 business days, depending on your bank or card issuer. You'll receive an email
        confirmation from Paddle once the refund is processed.
      </p>

      <h2>Cancellations</h2>
      <p>
        You can cancel your subscription at any time from your account's billing settings.
        Cancellation stops future renewals — your access continues through the end of the
        current paid billing period. Cancellation alone does not trigger a refund; if you
        also want a refund for the most recent charge, follow the refund-request steps above.
      </p>

      <h2>Questions</h2>
      <p>
        If you have any questions about this policy, contact us at
        {" "}<a href="mailto:support@clinicpro.io">support@clinicpro.io</a>.
      </p>
    </LegalPage>
  );
}
