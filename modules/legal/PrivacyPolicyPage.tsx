import Link from 'next/link';
import { LegalPageShell } from '@/components/legal/legal-page-shell';

const LAST_UPDATED = 'September 16, 2025';

export function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <section className="space-y-3">
        <p>
          This Privacy Policy describes how{' '}
          <strong>IE Network Solutions</strong> (&quot;IE Network
          Solutions,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
          collects, uses, stores, and protects information when you use{' '}
          <strong>Selamnew Business</strong> (the &quot;Service&quot;), a
          business CRM platform available at Selamnew and related domains.
        </p>
        <p>
          By using the Service, you agree to the collection and use of
          information in accordance with this policy. If you do not agree,
          please do not use the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          1. Information We Collect
        </h2>
        <p>We collect the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information:</strong> name, email address,
            organization/tenant details, and authentication credentials managed
            through Firebase Authentication (including sign-in with Google or
            Microsoft, where you choose those options).
          </li>
          <li>
            <strong>CRM data you provide:</strong> leads, deals, customers,
            contacts, tasks, notes, files, and other business records you or
            your organization enter into the Service.
          </li>
          <li>
            <strong>Productivity integration data:</strong> when you voluntarily
            connect a third-party email or calendar account (such as Google
            Gmail/Google Calendar or Microsoft 365), we access and store data
            from those services as described in Section 3 below.
          </li>
          <li>
            <strong>Usage and technical data:</strong> log data, device and
            browser information, IP address, and actions taken within the
            Service to operate, secure, and improve the platform.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          2. How We Use Your Information
        </h2>
        <p>We use collected information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, maintain, and improve the Service;</li>
          <li>
            Authenticate users and enforce access controls within your
            organization;
          </li>
          <li>
            Display and sync email, calendar, and contact data you connect for
            productivity features;
          </li>
          <li>
            Send transactional notifications related to your account and CRM
            activity;
          </li>
          <li>
            Detect, prevent, and address security issues, abuse, or technical
            problems;
          </li>
          <li>Comply with legal obligations.</li>
        </ul>
        <p>
          We do not use Google user data for advertising, and we do not sell
          personal information.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          3. Google API Services (Gmail, Calendar, and Contacts)
        </h2>
        <p>
          If you connect a Google account through the Productivity module, we
          request access only to the Google API scopes needed to provide the
          features you enable. Depending on your configuration, these may
          include:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Gmail</strong> (
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              gmail.modify
            </code>
            ,{' '}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              gmail.send
            </code>
            ): read, organize, and send email on your behalf within the Service;
          </li>
          <li>
            <strong>Google Calendar</strong> (
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              calendar
            </code>
            ,{' '}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              calendar.events
            </code>
            ): view and manage calendar events linked to CRM activity;
          </li>
          <li>
            <strong>Google Contacts</strong> (
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              contacts.readonly
            </code>
            ,{' '}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              contacts.other.readonly
            </code>
            ): read contact information to help associate communications with
            CRM records;
          </li>
          <li>
            Basic profile information (
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              openid
            </code>
            ,{' '}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              email
            </code>
            ,{' '}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              profile
            </code>
            ) to identify the connected account.
          </li>
        </ul>
        <p>
          Google user data accessed through these APIs is used solely to provide
          and improve user-facing features within Selamnew Business — such as
          viewing and sending mail, syncing calendar events, and matching
          messages to CRM records. We do not use Google user data to train
          generalized AI models, for advertising, or for purposes unrelated to
          the Service.
        </p>
        <p>
          Google user data is stored securely on our servers and is accessible
          only to authorized users within your organization according to your
          CRM permissions. Mailbox data may be retained for a limited period
          (typically up to 90 days of synced content, configurable by your
          administrator) unless you disconnect the integration or delete the
          data sooner.
        </p>
        <p>
          We do not transfer Google user data to third parties except: (a) to
          subprocessors that help us operate the Service under contractual
          confidentiality and security obligations; (b) when required by law; or
          (c) with your explicit direction (for example, when you send an email
          to an external recipient).
        </p>
        <p>
          Selamnew Business&apos;s use and transfer of information received from
          Google APIs adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          4. Microsoft 365 Integration
        </h2>
        <p>
          If you connect a Microsoft 365 account, we access mail, calendar, and
          profile data through Microsoft Graph with the permissions you approve
          during sign-in. This data is used only to provide Productivity
          features within the Service and is handled with the same security and
          limited-use principles described above for Google integrations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          5. Data Sharing
        </h2>
        <p>We share information only in the following circumstances:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Within your organization:</strong> CRM and connected
            productivity data is visible to users in your tenant according to
            role-based permissions you configure.
          </li>
          <li>
            <strong>Service providers:</strong> trusted infrastructure and
            hosting partners that process data on our behalf under strict
            agreements.
          </li>
          <li>
            <strong>Legal requirements:</strong> when we believe disclosure is
            required to comply with applicable law or protect rights and safety.
          </li>
        </ul>
        <p>We do not sell your personal information.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          6. Data Security and Retention
        </h2>
        <p>
          We implement administrative, technical, and organizational measures
          designed to protect your information, including encryption of OAuth
          tokens and access controls. No method of transmission or storage is
          completely secure; we work continuously to safeguard your data.
        </p>
        <p>
          We retain information for as long as your account is active or as
          needed to provide the Service, comply with legal obligations, resolve
          disputes, and enforce agreements. You may request deletion of your
          account data by contacting us.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          7. Your Choices and Rights
        </h2>
        <p>You can:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Disconnect Google or Microsoft accounts at any time from the
            Productivity settings in the Service, which stops further syncing;
          </li>
          <li>
            Revoke Selamnew Business&apos;s access to your Google account via{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Google Account Permissions
            </a>
            ;
          </li>
          <li>
            Request access, correction, or deletion of your personal data by
            contacting us at{' '}
            <a
              href="mailto:support@selamnew.com"
              className="font-medium text-primary hover:underline"
            >
              support@selamnew.com
            </a>
            .
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          8. International Users
        </h2>
        <p>
          The Service may be operated from facilities in various locations. By
          using the Service, you consent to the processing and transfer of your
          information to countries where we and our service providers operate,
          which may have different data protection laws than your jurisdiction.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          9. Changes to This Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the
          revised policy on this page and update the &quot;Last updated&quot;
          date. Material changes may also be communicated through the Service or
          by email where appropriate.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">
          10. Contact Us
        </h2>
        <p>
          If you have questions about this Privacy Policy or our data practices,
          contact us at:
        </p>
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
            href="/terms"
            className="font-medium text-primary hover:underline"
          >
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
