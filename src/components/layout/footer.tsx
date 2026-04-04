import Link from 'next/link';
import { ElectorateLogo } from '@/components/layout/electorate-logo';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Mail,
  MapPin,
} from 'lucide-react';

const footerLinks = {
  platform: [
    { name: 'Politicians', href: '/politicians' },
    { name: 'States', href: '/states' },
    { name: 'Leaderboard', href: '/leaderboard' },
    { name: 'Election 2027', href: '/election-2027' },
  ],
  resources: [
    { name: 'About Us', href: '/about' },
    // { name: 'Methodology', href: '/about#methodology' },
    { name: 'Data Sources', href: '/about#sources' },
    // { name: 'API Documentation', href: '/api-docs' },
  ],
  legal: [
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Privacy Policy', href: '/privacy' },
    // { name: 'Content Policy', href: '/content-policy' },
  ],
  // getInvolved: [
  //   { name: 'Submit a Tip', href: '/submit-tip' },
  //   { name: 'Report an Error', href: '/report' },
  //   { name: 'Partner With Us', href: '/partners' },
  //   { name: 'Donate', href: '/donate' },
  // ],
};

const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/electorating' },
  // { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/electorateng' },
  // { name: 'Instagram', icon: Instagram, href: 'https://instagram.com/electorateng' },
];

export function Footer() {
  return (
    <footer className="bg-[#271E5D] text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <ElectorateLogo theme="white" size="md" />
            </Link>
            <p className="text-sm text-white/70 mb-4">
              Know who represents you. Nigeria&apos;s definitive politician accountability platform.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="sr-only">{social.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-display font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-display font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get Involved */}
          {/* <div>
            <h3 className="font-display font-semibold mb-4">Get Involved</h3>
            <ul className="space-y-2">
              {footerLinks.getInvolved.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}                    git remote add origin <your-repo-url>
                    git push -u origin main
                  </Link>
                </li>
              ))}
            </ul>
          </div> */}

          {/* Legal */}
          <div>
            <h3 className="font-display font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-white/50">
              © {new Date().getFullYear()} Electorate. All rights reserved. 
            </p>
            <div className="flex items-center gap-4 text-sm text-white/50">
              <a href="mailto:hello@electorate.ng" className="flex items-center gap-1 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                hello@electorate.ng
              </a>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Nigeria
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
