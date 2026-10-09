import Link from 'next/link';
import { LegalPageShell } from '@/components/legal/legal-page-shell';

const LAST_UPDATED = 'September 16, 2025';

export function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <section className="space-y-3">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and
          use of <strong>Selamnew Business</strong> (the &quot;Service&quot;),
          provided by <strong>IE Network Solutions</strong> (&quot;IE Network
          Solutions,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
          By accessing or using the Service, you agree to these Terms. If you
          are using the Service on behalf of an organization, you represent that
          you have authority to bind that organization.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          1. The Service
        </h2>
        <p>
          Selamnew Business is a customer relationship management (CRM) platform
          that helps organizations manage leads, deals, customers,
          communications, and related business workflows. Features may include
          optional integrations with third-party services such as Google Gmail,
          Google Calendar, and Microsoft 365.
        </p>
        <p>
          We may modify, suspend, or discontinue any part of the Service at any
          time. We will make reasonable efforts to notify you of material
          changes that affect your use of the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          2. Accounts and Access
        </h2>
        <p>
          You must provide accurate account information and keep your
          credentials secure. You are responsible for all activity under your
          account. Access to features and data within the Service is controlled
          by your organization&apos;s administrator through role-based
          permissions.
        </p>
        <p>
          You must be at least 18 years old (or the age of legal majority in
          your jurisdiction) to use the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          3. Acceptable Use
        </h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Use the Service in violation of any applicable law or regulation;
          </li>
          <li>Upload or transmit unlawful, harmful, or infringing content;</li>
          <li>
            Attempt to gain unauthorized access to the Service or other
            users&apos; data;
          </li>
          <li>
            Interfere with or disrupt the integrity or performance of the
            Service;
          </li>
          <li>
            Reverse engineer or attempt to extract source code except as
            permitted by law;
          </li>
          <li>
            Use the Service to send unsolicited bulk communications (spam).
          </li>
        </ul>
        <p>
          We may suspend or terminate access if we reasonably believe you have
          violated these Terms or pose a security risk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          4. Third-Party Integrations
        </h2>
        <p>
          The Service may allow you to connect third-party accounts (such as
          Google or Microsoft). Your use of those services is subject to their
          respective terms and privacy policies. By connecting an account, you
          authorize us to access and process data from that service as described
          in our{' '}
          <Link
            href="/privacy"
            className="font-medium text-primary hover:underline"
          >
            Privacy Policy
          </Link>{' '}
          and only to provide the features you enable.
        </p>
        <p>
          You may disconnect integrations at any time through the Productivity
          settings in the Service. Disconnecting stops future syncing but may
          not automatically delete data already stored in the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          5. Your Data
        </h2>
        <p>
          You retain ownership of the business data you submit to the Service.
          You grant us a limited license to host, process, and display that data
          solely to provide and improve the Service for you and your
          organization.
        </p>
        <p>
          You are responsible for ensuring you have the right to upload and
          process any data you enter into the Service, including personal data
          of your customers and contacts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          6. Intellectual Property
        </h2>
        <p>
          The Service, including its software, design, branding, and
          documentation, is owned by IE Network Solutions and its licensors and
          is protected by intellectual property laws. These Terms do not grant
          you any rights to our trademarks or branding except as needed to use
          the Service as intended.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          7. Disclaimer of Warranties
        </h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
          WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING
          IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL
          BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          8. Limitation of Liability
        </h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IE NETWORK SOLUTIONS AND ITS
          AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
          ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE
          SERVICE.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE
          TERMS OR THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID US FOR THE
          SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED
          U.S. DOLLARS (USD $100) IF NO FEES WERE PAID.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          9. Indemnification
        </h2>
        <p>
          You agree to indemnify and hold harmless IE Network Solutions from any
          claims, damages, losses, and expenses (including reasonable legal
          fees) arising from your use of the Service, your data, or your
          violation of these Terms or applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          10. Termination
        </h2>
        <p>
          You may stop using the Service at any time. We may suspend or
          terminate your access if you breach these Terms or if required for
          legal or security reasons. Upon termination, your right to use the
          Service ends. Provisions that by their nature should survive
          termination will survive, including ownership, disclaimers,
          limitations of liability, and indemnification.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          11. Governing Law
        </h2>
        <p>
          These Terms are governed by the laws of the Federal Democratic
          Republic of Ethiopia, without regard to conflict-of-law principles,
          except where mandatory local consumer protection laws apply.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          12. Changes to These Terms
        </h2>
        <p>
          We may update these Terms from time to time. We will post the updated
          Terms on this page and update the &quot;Last updated&quot; date.
          Continued use of the Service after changes become effective
          constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          13. Contact
        </h2>
        <p>Questions about these Terms may be sent to:</p>
        <p>
          <strong>IE Network Solutions</strong>
          <br />
          Email:{' '}
          <a
            href="mailto:support@selamnew.com"
            className="font-medium text-primary hover:underline"
          >
            support@selamnew.com
          </a>
        </p>
        <p>
          See also our{' '}
          <Link
            href="/privacy"
            className="font-medium text-primary hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
