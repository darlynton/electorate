'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth, signOut } from '@/lib/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SearchBar } from '@/components/search';
import { SignupDialog } from '@/components/auth/signup-dialog';
import { LoginDialog } from '@/components/auth/login-dialog';
import { LocationSetupDialog } from '@/components/auth/location-setup-dialog';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { ElectorateLogo } from '@/components/layout/electorate-logo';
import { getContributorTier } from '@/lib/utils';
import {
  Menu,
  Users,
  Map,
  Trophy,
  Vote,
  Info,
  LogOut,
  MapPin,
  Mail,
  AlertCircle,
  UserCircle2,
} from 'lucide-react';

const navigation = [
  { name: 'Politicians', href: '/politicians', icon: Users },
  { name: 'States', href: '/states', icon: Map },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { name: 'Election 2027', href: '/election-2027', icon: Vote },
  { name: 'About', href: '/about', icon: Info },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user, profile, isLoading, emailVerified, hasLocation, canUpdateLocation } =
    useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Contributor tier from profile score
  const contributorScore = profile?.contribution_score ?? 0;
  const tier = contributorScore > 0 ? getContributorTier(contributorScore) : null;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <ElectorateLogo size="md" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-[#271E5D] dark:hover:text-white transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="relative flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#271E5D]">
                    <Avatar className="h-9 w-9 border-2 border-[#271E5D]/20 dark:border-white/20 hover:border-[#271E5D]/60 dark:hover:border-white/60 transition-colors cursor-pointer">
                      <AvatarFallback className="bg-[#271E5D]/10 dark:bg-white/10 text-[#271E5D] dark:text-white text-sm font-semibold">
                        {user.email?.[0]?.toUpperCase() ?? <UserCircle2 className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    {/* unverified dot */}
                    {!emailVerified && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white dark:border-card" />
                    )}
                    {/* tier emoji — only for contributor and above */}
                    {emailVerified && tier && tier.key !== 'newcomer' && (
                      <span className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none">
                        {tier.emoji}
                      </span>
                    )}
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-64">
                    {/* Identity */}
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </p>
                      {!emailVerified && (
                        <p className="text-xs text-amber-600 flex items-center gap-1.5 mt-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Email not verified
                        </p>
                      )}
                    </div>

                    {/* Contributor tier */}
                    {tier && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-2">
                          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium ${tier.bgColor} ${tier.color}`}>
                            <span className="text-base">{tier.emoji}</span>
                            <div>
                              <p className="font-semibold leading-none">{tier.label}</p>
                              <p className="text-xs opacity-80 mt-0.5">{contributorScore} pts · {profile?.approved_count ?? 0} approved</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                      {/* Location */}
                      <DropdownMenuItem
                        className={`gap-2 cursor-pointer ${hasLocation ? 'text-green-700' : 'text-amber-600'}`}
                        onClick={() => setLocationDialogOpen(true)}
                      >
                        <MapPin className="h-4 w-4" />
                        {hasLocation ? 'Location set' : 'Set your location'}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                      {/* Sign out */}
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <LoginDialog
                    triggerLabel={isLoading ? 'Loading...' : 'Log In'}
                    triggerClassName="inline-flex items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    open={loginOpen}
                    onOpenChange={setLoginOpen}
                  />
                  <SignupDialog
                    triggerLabel="Sign Up"
                    triggerClassName="inline-flex items-center justify-center gap-2 rounded-md bg-[#271E5D] hover:bg-[#271E5D]/90 px-3 py-2 text-sm font-medium text-white transition-colors"
                    onSwitchToLogin={() => setLoginOpen(true)}
                  />
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-lg p-1.5 text-foreground hover:bg-muted transition-colors">
                <Menu className="w-6 h-6" />
                <span className="sr-only">Open menu</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 px-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6 px-4 pt-2">
                    <Link
                      href="/"
                      className="flex items-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ElectorateLogo size="md" />
                    </Link>
                  </div>

                  <SearchBar className="mb-6 px-4" placeholder="Search politicians..." />

                  <nav className="flex flex-col gap-2 px-3">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-[#271E5D]/5 dark:hover:bg-white/5 hover:text-[#271E5D] dark:hover:text-white transition-colors"
                        >
                          <Icon className="w-5 h-5" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="mt-auto pt-6 border-t px-4 pb-4 space-y-3">
                    {user ? (
                      <>
                        {/* Profile card */}
                        <div className="flex items-center gap-3 px-1 py-2">
                          <Avatar className="h-10 w-10 border-2 border-[#271E5D]/20 dark:border-white/20 shrink-0">
                            <AvatarFallback className="bg-[#271E5D]/10 dark:bg-white/10 text-[#271E5D] dark:text-white font-semibold">
                              {user.email?.[0]?.toUpperCase() ?? '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 shrink-0" />
                              {user.email}
                            </p>
                            {!emailVerified && (
                              <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                Email not verified
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Tier badge */}
                        {tier && (
                          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${tier.bgColor} ${tier.color}`}>
                            <span className="text-lg">{tier.emoji}</span>
                            <div>
                              <p className="font-semibold leading-none">{tier.label}</p>
                              <p className="text-xs opacity-75 mt-0.5">{contributorScore} pts · {profile?.approved_count ?? 0} approved</p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 pt-1">
                          <Button
                            variant="outline"
                            className={`w-full gap-2 ${hasLocation ? 'text-green-700 border-green-200' : 'text-amber-600 border-amber-200'}`}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setLocationDialogOpen(true);
                            }}
                          >
                            <MapPin className="w-4 h-4" />
                            {hasLocation ? 'Location set' : 'Set your location'}
                          </Button>

                          <Button
                            variant="outline"
                            className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                            onClick={async () => {
                              await handleSignOut();
                              setMobileMenuOpen(false);
                            }}
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <LoginDialog
                          triggerLabel="Log In"
                          triggerClassName="w-full inline-flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                          open={loginOpen}
                          onOpenChange={setLoginOpen}
                        />
                        <SignupDialog
                          triggerLabel="Sign Up to Track"
                          triggerClassName="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#271E5D] hover:bg-[#271E5D]/90 px-4 py-2 text-sm font-medium text-white transition-colors"
                          onSwitchToLogin={() => { setMobileMenuOpen(false); setLoginOpen(true); }}
                        />
                        <p className="text-xs text-center text-muted-foreground">
                          Sign in to submit tips and earn badges
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Location setup dialog */}
      <LocationSetupDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        profile={profile}
        canUpdate={canUpdateLocation}
      />
    </>
  );
}
