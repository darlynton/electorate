import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Shield,
  Eye,
  Users,
  Database,
  Globe,
  Heart,
  ArrowRight,
  Mail,
  Twitter,
} from 'lucide-react';

const values = [
  {
    icon: Eye,
    title: 'Transparency',
    description: 'We make all data sources, methodology, and algorithms publicly available for scrutiny.',
    color: 'text-[#271E5D] bg-[#271E5D]/10',
  },
  {
    icon: Shield,
    title: 'Non-Partisan',
    description: 'Electorate tracks and surfaces Electoratings for all elected officials equally, regardless of party affiliation.',
    color: 'text-[#00C49A] bg-[#00C49A]/10',
  },
  {
    icon: Database,
    title: 'Evidence-Based',
    description: 'Every data point is sourced from official records, court filings, and verified news.',
    color: 'text-[#5D49D6] bg-[#5D49D6]/10',
  },
  {
    icon: Heart,
    title: 'Citizen-First',
    description: 'Built for ordinary Nigerians who want to hold their elected officials accountable.',
    color: 'text-[#E84C30] bg-[#E84C30]/10',
  },
];

const dataStats = [
  { label: 'Elected Officials Tracked', value: '1,650+' },
  { label: 'States Covered', value: '36 + FCT' },
  { label: 'Promises Tracked', value: '2,847' },
  { label: 'Legal Cases Monitored', value: '89+' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#271E5D] to-[#2D2463] text-white py-10 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-[#5D49D6] text-white mb-4 md:mb-6">About Electorate</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-4 md:mb-6">
            Democratising{' '}
            <span className="text-[#5D49D6]">Accountability</span>
          </h1>
          <p className="text-base md:text-xl text-white/80 max-w-3xl mx-auto">
            Electorate is Nigeria&apos;s civic accountability platform — where constituents
            submit Electoratings for their officials, track promises, and demand transparency.
            Rate them. Hold them accountable.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 -mt-8 relative z-10 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {dataStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-2xl shadow-md p-4 md:p-6 text-center border border-border"
            >
              <div className="font-mono text-2xl md:text-3xl font-bold text-[#271E5D] dark:text-[#5D49D6]">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
              Our Mission
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Nigeria&apos;s democratic dividend depends on citizens having access to accurate,
              timely, and actionable information about their elected officials. From the President
              to local government chairmen, every official should face the same standard of
              transparency — and every constituent should be empowered to submit their Electorating.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed mt-4">
              Electorate makes this possible by aggregating data from NASS, state assemblies,
              EFCC, ICPC, federal courts, and credible news sources — and by giving every
              Nigerian a platform to submit Electoratings every month.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            Our Values
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <Card key={value.title} className="border-none shadow-sm">
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${value.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
              Our Data Sources
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'National Assembly (NASS) official records',
                'State House of Assembly records',
                'EFCC & ICPC public case records',
                'Federal High Court judgments',
                'State Governors\' official statements',
                'INEC election results',
                'Civil society monitoring reports',
                'Verified investigative journalism',
              ].map((source) => (
                <div
                  key={source}
                  className="flex items-center gap-3 bg-card rounded-xl p-4 border"
                >
                  <Database className="w-4 h-4 text-[#271E5D] dark:text-[#5D49D6] flex-shrink-0" />
                  <span className="text-sm">{source}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-12 bg-[#271E5D] text-white">
        <div className="container mx-auto px-4 text-center">
          <Globe className="w-12 h-12 text-[#5D49D6] mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-4">Get In Touch</h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8">
            Have a tip? Found an error? Want to partner with us? We&apos;d love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:hello@electorate.ng">
              <Button size="lg" className="bg-[#5D49D6] text-white hover:bg-[#5D49D6]/90 gap-2">
                <Mail className="w-5 h-5" />
                hello@electorate.ng
              </Button>
            </a>
            <a href="https://twitter.com/electorateng" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 gap-2">
                <Twitter className="w-5 h-5" />
                @electorateng
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export const metadata = {
  title: 'About Electorate',
  description: 'Learn about Electorate — Nigeria\'s definitive politician accountability and transparency platform.',
};
