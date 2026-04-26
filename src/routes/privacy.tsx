import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — ClinicPro" },
      { name: "description", content: "How Divan Digital Corp collects, uses, and protects personal data in ClinicPro." },
      { property: "og:title", content: "Privacy Notice — ClinicPro" },
      { property: "og:description", content: "How ClinicPro collects, uses, and protects personal data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice" updated="April 26, 2026">
      <p>
        This Privacy Notice explains how <strong>Divan Digital Corp</strong> ("ClinicPro",
        "we", "us") collects, uses, shares, and protects personal data when you use the
        ClinicPro platform and websites (the "Service"). For the personal data you provide as
        a user of the Service, Divan Digital Corp acts as the <strong>data controller</strong>.
      </p>
      <p>
        Where you use ClinicPro to manage your own clinic's clients, you are the controller
        of your clients' data and we act as a <strong>processor</strong> on your behalf.
      </p>

      <h2>1. Personal Data We Collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email, password (hashed), clinic name, role, phone number.</li>
        <li><strong>Clinic content:</strong> services, staff, schedules, inventory, marketing campaigns, and other operational data you create in the Service.</li>
        <li><strong>Client records (processor):</strong> client name, contact details, appointment history, notes, consent forms, and other records your clinic uploads.</li>
        <li><strong>Support communications:</strong> messages, attachments, and metadata when you contact us.</li>
        <li><strong>Usage and telemetry:</strong> pages visited, features used, performance and error logs.</li>
        <li><strong>Device and connection data:</strong> IP address, browser type, operating system, device identifiers, and timestamps.</li>
      </ul>
      <p>
        Payment-card details are collected and processed directly by our Merchant of Record,
        Paddle, and are never stored on our servers.
      </p>

      <h2>2. How We Use Personal Data</h2>
      <ul>
        <li><strong>Provide the Service</strong> — create accounts, authenticate users, deliver features (contract performance).</li>
        <li><strong>Customer support</strong> — respond to questions, troubleshoot issues (legitimate interests).</li>
        <li><strong>Security & fraud prevention</strong> — monitor for unauthorized access and abuse (legitimate interests, legal obligation).</li>
        <li><strong>Product improvement</strong> — analyze aggregated usage to improve features and reliability (legitimate interests).</li>
        <li><strong>Billing & tax</strong> — facilitate payments and meet tax obligations through Paddle (contract performance, legal obligation).</li>
        <li><strong>Communications</strong> — send transactional emails (e.g. receipts, security alerts). Marketing emails are sent only with your consent and you can opt out at any time.</li>
        <li><strong>Legal compliance</strong> — comply with applicable laws and respond to lawful requests (legal obligation).</li>
      </ul>

      <h2>3. Legal Bases (UK/EEA Users)</h2>
      <p>We rely on the following legal bases under GDPR/UK GDPR:</p>
      <ul>
        <li><strong>Performance of a contract</strong> — to provide the Service you've subscribed to.</li>
        <li><strong>Legitimate interests</strong> — for security, analytics, and product improvement, balanced against your rights.</li>
        <li><strong>Consent</strong> — for marketing communications and non-essential cookies; you can withdraw at any time.</li>
        <li><strong>Legal obligation</strong> — to comply with tax, accounting, and legal requirements.</li>
      </ul>

      <h2>4. Sharing Personal Data</h2>
      <p>We share personal data only with:</p>
      <ul>
        <li>
          <strong>Service providers / sub-processors</strong> — cloud hosting, database, email
          delivery, error monitoring, customer support, and analytics providers, all under
          confidentiality and data-protection terms.
        </li>
        <li>
          <strong>Paddle.com</strong>, our Merchant of Record — for sale of the product,
          subscription management, payment processing, tax compliance, invoicing, and refunds.
        </li>
        <li>
          <strong>Professional advisers</strong> — legal, accounting, and audit professionals
          when reasonably necessary.
        </li>
        <li>
          <strong>Authorities</strong> — when required by law, court order, or to protect
          our rights, safety, or that of others.
        </li>
        <li>
          <strong>Successors</strong> — in connection with a merger, acquisition, or sale of
          assets, subject to equivalent privacy commitments.
        </li>
      </ul>
      <p>We do not sell personal data.</p>

      <h2>5. International Transfers</h2>
      <p>
        Your data may be processed in countries outside your country of residence, including
        Canada, the United States, and the European Union. Where we transfer personal data
        from the UK or EEA to a country without an adequacy decision, we rely on appropriate
        safeguards such as Standard Contractual Clauses.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain personal data only for as long as necessary to provide the Service, comply
        with our legal obligations (such as tax and accounting), resolve disputes, and
        enforce our agreements. Account data is typically retained for the life of your
        account plus a 90-day grace period after closure, after which it is deleted or
        anonymised. Backups follow our standard rotation schedule and are purged on the same
        timeline.
      </p>

      <h2>7. Your Rights</h2>
      <p>
        Subject to applicable law, you may have the following rights with respect to your
        personal data:
      </p>
      <ul>
        <li><strong>Access</strong> — request a copy of personal data we hold about you.</li>
        <li><strong>Rectification</strong> — correct inaccurate or incomplete data.</li>
        <li><strong>Erasure</strong> — request deletion in certain circumstances.</li>
        <li><strong>Restriction</strong> — limit how we process your data in certain situations.</li>
        <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
        <li><strong>Objection</strong> — object to processing based on legitimate interests or for direct marketing.</li>
        <li><strong>Withdraw consent</strong> — where processing is based on consent.</li>
        <li><strong>Complaint</strong> — lodge a complaint with your local supervisory authority.</li>
      </ul>
      <p>
        To exercise any of these rights, email us at
        {" "}<a href="mailto:privacy@clinicpro.io">privacy@clinicpro.io</a>. We will respond
        within one month, as required by GDPR.
      </p>

      <h2>8. Security</h2>
      <p>
        We implement appropriate technical and organisational measures to protect personal
        data, including encryption in transit (TLS) and at rest, role-based access controls,
        audit logging, regular security reviews, and employee training. No system can be
        guaranteed 100% secure, but we work continuously to safeguard your information.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use cookies and similar technologies for the following purposes:
      </p>
      <ul>
        <li><strong>Essential</strong> — required for authentication, session management, and core functionality. These cannot be disabled.</li>
        <li><strong>Analytics</strong> — help us understand how the Service is used so we can improve it. Set only with your consent.</li>
        <li><strong>Marketing</strong> — used for advertising and campaign measurement. Set only with your consent.</li>
      </ul>
      <p>
        You can manage cookie preferences in your browser settings or, where available,
        through our in-app cookie controls.
      </p>

      <h2>10. Children</h2>
      <p>
        ClinicPro is not directed to children under 16. We do not knowingly collect personal
        data from children. If you believe we have collected such data, contact us and we
        will delete it.
      </p>

      <h2>11. Changes to This Notice</h2>
      <p>
        We may update this Privacy Notice from time to time. Material changes will be
        communicated by email or in-app notice. The "Last updated" date at the top of this
        page reflects the latest revision.
      </p>

      <h2>12. Contact</h2>
      <p>
        Divan Digital Corp · Toronto, Canada<br />
        Email: <a href="mailto:privacy@clinicpro.io">privacy@clinicpro.io</a>
      </p>
    </LegalPage>
  );
}
