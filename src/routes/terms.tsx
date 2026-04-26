import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ClinicPro" },
      { name: "description", content: "Terms governing your use of ClinicPro by Divan Digital Corp." },
      { property: "og:title", content: "Terms of Service — ClinicPro" },
      { property: "og:description", content: "Terms governing your use of ClinicPro." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="April 26, 2026">
      <p>
        These Terms of Service ("Terms") govern your access to and use of the ClinicPro
        software and services ("Service"), provided by <strong>Divan Digital Corp</strong>
        {" "}("ClinicPro", "we", "us", or "our"). By creating an account, accessing, or using the
        Service, you agree to be bound by these Terms.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By continuing to access or use the Service, you confirm that you have read,
        understood, and agree to these Terms. If you are using the Service on behalf of a
        clinic, business, or other entity, you represent that you have authority to bind that
        entity to these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>2. The Service</h2>
      <p>
        ClinicPro provides a clinic management platform including online booking, client
        records, scheduling, payments, marketing, inventory, and related operational tools.
        Specific features available to you depend on the subscription plan you select.
      </p>

      <h2>3. Account, Credentials & Accuracy</h2>
      <ul>
        <li>You must provide accurate, current, and complete information when registering and keep it up to date.</li>
        <li>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.</li>
        <li>Notify us promptly of any unauthorized access or suspected security breach.</li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to misuse the Service. In particular, you must not:</p>
      <ul>
        <li>Use the Service for any unlawful, fraudulent, or deceptive purpose;</li>
        <li>Send spam or unsolicited communications, or violate anti-spam laws;</li>
        <li>Infringe the intellectual property, privacy, or other rights of any third party;</li>
        <li>Upload malware, probe or scan the Service's vulnerabilities, or interfere with its security;</li>
        <li>Scrape, harvest, or extract data from the Service by automated means without our written consent;</li>
        <li>Reverse engineer, decompile, or attempt to derive the source code of the Service;</li>
        <li>Resell, sublicense, or redistribute the Service without our written consent.</li>
      </ul>

      <h2>5. License</h2>
      <p>
        Subject to your compliance with these Terms and timely payment of applicable fees,
        we grant you a limited, non-exclusive, non-transferable, revocable right to access
        and use the Service for your internal business purposes during your subscription.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        Divan Digital Corp owns and retains all right, title, and interest in and to the
        Service, including all software, designs, documentation, trademarks, and any
        improvements or derivative works. No rights are granted to you other than the limited
        license expressly stated in these Terms.
      </p>

      <h2>7. Customer Data</h2>
      <p>
        You retain ownership of the data you and your clients submit to the Service ("Customer
        Data"). You grant us a limited, worldwide license to host, process, transmit, and
        display Customer Data solely to provide and improve the Service and as described in
        our <a href="/privacy">Privacy Notice</a>.
      </p>

      <h2>8. Payments, Subscriptions & Merchant of Record</h2>
      <p>
        Our order process is conducted by our online reseller <strong>Paddle.com</strong>.
        Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer
        service inquiries and handles returns. Payment, billing, taxes, currency conversion,
        chargebacks, cancellations, and refund mechanics are governed by Paddle's
        {" "}<a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">Buyer Terms</a>.
      </p>
      <ul>
        <li>Subscriptions renew automatically at the end of each billing period unless cancelled.</li>
        <li>Fees are charged in advance for each billing period (monthly or annual, as selected).</li>
        <li>Upgrades take effect immediately with prorated billing; downgrades take effect at the end of the current billing period.</li>
        <li>You can cancel at any time; access continues until the end of your paid period.</li>
      </ul>
      <p>
        For our refund terms, see our <a href="/refunds">Refund Policy</a>.
      </p>

      <h2>9. Service Availability</h2>
      <p>
        We strive to keep the Service available, but we do not guarantee uninterrupted,
        timely, secure, or error-free operation. Maintenance, updates, and circumstances
        outside our reasonable control may affect availability.
      </p>

      <h2>10. Suspension & Termination</h2>
      <p>We may suspend or terminate your access to the Service if:</p>
      <ul>
        <li>You materially breach these Terms;</li>
        <li>Payment is overdue or fails;</li>
        <li>Your use creates a security, legal, or fraud risk to us or other users;</li>
        <li>You repeatedly or seriously violate our policies or applicable law.</li>
      </ul>
      <p>
        On termination, your right to use the Service ends. We will make Customer Data
        available for export for a reasonable period (typically 30 days) before deletion in
        accordance with our retention practices.
      </p>

      <h2>11. Warranty Disclaimer</h2>
      <p>
        To the fullest extent permitted by law, the Service is provided "as is" and "as
        available" without warranties of any kind, whether express or implied, including
        warranties of merchantability, fitness for a particular purpose, or non-infringement.
      </p>

      <h2>12. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, our aggregate liability arising out of or
        related to the Service is limited to the fees you paid to us in the twelve (12)
        months preceding the event giving rise to the claim. We will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or any loss of
        profits, revenue, data, or goodwill. Nothing in these Terms limits liability for
        fraud, death, or personal injury where such limitation is prohibited by law.
      </p>

      <h2>13. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless Divan Digital Corp from any claims, damages,
        liabilities, and expenses (including reasonable legal fees) arising from your
        Customer Data, your unlawful use of the Service, or your breach of these Terms.
      </p>

      <h2>14. Governing Law & Disputes</h2>
      <p>
        These Terms are governed by the laws of the Province of Ontario and the federal laws
        of Canada applicable therein, without regard to conflict-of-laws principles. The
        courts located in Toronto, Ontario will have exclusive jurisdiction over any dispute
        arising out of or related to these Terms.
      </p>

      <h2>15. Assignment</h2>
      <p>
        You may not assign these Terms without our prior written consent. We may assign
        these Terms in connection with a merger, acquisition, reorganization, or sale of
        assets.
      </p>

      <h2>16. Force Majeure</h2>
      <p>
        Neither party is liable for any failure or delay in performance caused by events
        beyond reasonable control, including natural disasters, war, terrorism, civil unrest,
        labor disputes, internet or utility outages, or governmental action.
      </p>

      <h2>17. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be communicated by
        email or in-app notice. Continued use of the Service after changes take effect
        constitutes acceptance.
      </p>

      <h2>18. Contact</h2>
      <p>
        Divan Digital Corp · Toronto, Canada · <a href="mailto:support@clinicpro.io">support@clinicpro.io</a>
      </p>
    </LegalPage>
  );
}
