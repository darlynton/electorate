import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-foreground mb-8">
        Privacy Policy
      </h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
        <p className="text-sm">Last updated: April 2026</p>

        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
          <p>When you use Electorate, we may collect:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account information:</strong> phone number, email address, and password</li>
            <li><strong>Location data:</strong> state, LGA, and ward (provided voluntarily for representative matching)</li>
            <li><strong>Usage data:</strong> pages visited, ratings submitted, and contributions made</li>
            <li><strong>Device data:</strong> browser type, IP address, and operating system</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Create and manage your account</li>
            <li>Match you with your local representatives</li>
            <li>Display your contributions and contributor tier</li>
            <li>Send verification codes via SMS</li>
            <li>Improve the platform and fix issues</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Information Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Supabase:</strong> our database and authentication provider</li>
            <li><strong>Twilio:</strong> for SMS verification codes</li>
            <li><strong>Vercel:</strong> our hosting provider</li>
          </ul>
          <p>
            These services process data solely to provide their services to us and are
            bound by their own privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
          <p>
            We use industry-standard security measures including encrypted connections
            (HTTPS), secure password hashing, and row-level security in our database.
            However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Withdraw consent for data processing</li>
          </ul>
          <p>
            To exercise these rights, contact us at{' '}
            <a href="mailto:hello@electorate.ng" className="text-[#5D49D6] hover:underline">
              hello@electorate.ng
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. We do
            not use third-party tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Children&apos;s Privacy</h2>
          <p>
            Electorate is not directed at children under 13. We do not knowingly collect
            personal information from children.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of
            significant changes via the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
          <p>
            For privacy-related questions, please email{' '}
            <a href="mailto:hello@electorate.ng" className="text-[#5D49D6] hover:underline">
              hello@electorate.ng
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
