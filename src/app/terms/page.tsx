import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-foreground mb-8">
        Terms of Service
      </h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
        <p className="text-sm">Last updated: April 2026</p>

        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Electorate (&quot;the Platform&quot;), you agree to be bound by
            these Terms of Service. If you do not agree, please do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
          <p>
            Electorate is a civic transparency platform that provides information about
            elected officials in Nigeria, including their voting records, accountability
            scores, and other publicly available data. Users may contribute information,
            rate officials, and submit tips.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
          <p>
            You may create an account using your phone number and email address. You are
            responsible for maintaining the confidentiality of your account credentials and
            for all activities under your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. User Contributions</h2>
          <p>
            When you submit information, edits, or tips, you confirm that the information
            is accurate to the best of your knowledge. All contributions are subject to
            review and moderation. We reserve the right to reject, edit, or remove
            contributions at our discretion.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Submit false or misleading information</li>
            <li>Harass, defame, or threaten any individual</li>
            <li>Attempt to manipulate ratings or accountability scores</li>
            <li>Use automated tools to scrape or access the Platform</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Disclaimer</h2>
          <p>
            The information on this platform is provided for general informational
            purposes only. While we strive for accuracy, we make no warranties about the
            completeness, reliability, or accuracy of the information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Platform
            after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
          <p>
            For questions about these Terms, please contact us at{' '}
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
