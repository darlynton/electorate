'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Phone,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Mail,
  Lock,
  MapPin,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { signUpWithEmail, resendVerificationEmail } from '@/lib/use-auth';
import { LocationSetupDialog } from './location-setup-dialog';
import type { UserProfile } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';

interface SignupDialogProps {
  triggerLabel?: string;
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSwitchToLogin?: () => void;
}

type Step = 'phone' | 'otp' | 'credentials' | 'verify-email' | 'location' | 'done';

export function SignupDialog({
  triggerLabel = 'Sign Up',
  triggerClassName,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSwitchToLogin,
}: SignupDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // For email verification polling
  const [emailCheckInterval, setEmailCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // For location step
  const [locationOpen, setLocationOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const reset = useCallback(() => {
    setStep('phone');
    setPhone('');
    setFormattedPhone('');
    setOtp('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError(null);
    setDevOtp(null);
    setIsLoading(false);
    setResendCooldown(0);
    if (emailCheckInterval) {
      clearInterval(emailCheckInterval);
      setEmailCheckInterval(null);
    }
  }, [emailCheckInterval]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (emailCheckInterval) clearInterval(emailCheckInterval);
    };
  }, [emailCheckInterval]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // -------------------------------------------------------
  // Step 1: Send OTP
  // -------------------------------------------------------
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // phone is already E.164 from PhoneInput (e.g. "+2348012345678")
    const cleaned = phone.replace(/\s+/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
      setError('Enter a valid phone number');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Failed to send OTP');
        setIsLoading(false);
        return;
      }

      setFormattedPhone(json.phone);
      if (json._dev_otp) setDevOtp(json._dev_otp);
      setStep('otp');
    } catch {
      setError('Network error — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------
  // Step 2: Verify OTP
  // -------------------------------------------------------
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, otp }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Invalid code');
        setIsLoading(false);
        return;
      }

      setStep('credentials');
    } catch {
      setError('Network error — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------
  // Step 3: Email + Password → Supabase signUp
  // -------------------------------------------------------
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await signUpWithEmail(
        email,
        password,
        formattedPhone,
      );

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      // If user is returned but not confirmed, go to verify-email step
      if (data?.user && !data.user.email_confirmed_at) {
        setStep('verify-email');
        startEmailVerificationPolling();
      } else if (data?.user?.email_confirmed_at) {
        // Already confirmed (e.g. Supabase has auto-confirm on)
        setStep('location');
      }
    } catch {
      setError('Something went wrong — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------
  // Step 4: Poll for email verification
  // -------------------------------------------------------
  const startEmailVerificationPolling = () => {
    if (emailCheckInterval) clearInterval(emailCheckInterval);

    const interval = setInterval(async () => {
      try {
        // Refresh the session to see if email_confirmed_at has been set
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email_confirmed_at) {
          clearInterval(interval);
          setEmailCheckInterval(null);
          setStep('location');
        }
      } catch {
        // ignore
      }
    }, 3000);

    setEmailCheckInterval(interval);
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    setError(null);

    const { error: resendError } = await resendVerificationEmail(email);
    if (resendError) {
      setError(resendError.message);
    } else {
      setResendCooldown(60);
    }
  };

  // -------------------------------------------------------
  // Step 5: Constituency mapping (location)
  // -------------------------------------------------------
  const handleLocationSaved = async () => {
    setLocationOpen(false);
    setStep('done');
    setTimeout(() => {
      onOpenChange(false);
      reset();
    }, 1500);
  };

  const handleSkipLocation = () => {
    setStep('done');
    setTimeout(() => {
      onOpenChange(false);
      reset();
    }, 1500);
  };

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) reset();
        }}
      >
        {!isControlled && (
          <DialogTrigger
            className={
              triggerClassName ??
              'inline-flex items-center justify-center gap-2 rounded-md bg-[#271E5D] dark:bg-[#5D49D6] hover:bg-[#271E5D]/90 dark:hover:bg-[#5D49D6]/90 px-4 py-2 text-sm font-medium text-white transition-colors'
            }
          >
            {triggerLabel}
          </DialogTrigger>
        )}

        <DialogContent className="max-w-md">
          {/* Step 1 — Phone number */}
          {step === 'phone' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
                  Create your account
                </DialogTitle>
                <DialogDescription>
                  Enter your phone number to get started. We&apos;ll send a
                  verification code via SMS.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSendOtp} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone number</Label>
                  <PhoneInput
                    id="signup-phone"
                    value={phone}
                    onChange={(val) => setPhone(val)}
                    autoFocus
                    placeholder="8012345678"
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gap-2 bg-[#271E5D] dark:bg-[#5D49D6] hover:bg-[#271E5D]/90 dark:hover:bg-[#5D49D6]/90"
                  disabled={isLoading || phone.replace(/\D/g, '').length < 10}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {isLoading ? 'Sending...' : 'Send verification code'}
                </Button>
              </form>
            </>
          )}

          {/* Step 2 — OTP verification */}
          {step === 'otp' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
                  Verification code
                </DialogTitle>
                <DialogDescription>
                  Enter the 6-digit code sent to{' '}
                  <span className="font-medium text-foreground">
                    {formattedPhone}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-otp">Code</Label>
                  <Input
                    id="signup-otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    autoFocus
                    required
                    maxLength={6}
                    className="text-center text-xl tracking-[0.5em] font-mono"
                  />
                  {process.env.NODE_ENV === 'development' && devOtp && (
                    <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-md px-3 py-2">
                      Dev mode — your code is: <strong>{devOtp}</strong>
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                      setError(null);
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gap-2 bg-[#271E5D] dark:bg-[#5D49D6] hover:bg-[#271E5D]/90 dark:hover:bg-[#5D49D6]/90"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    {isLoading ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>

                <button
                  type="button"
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    setError(null);
                    setOtp('');
                    void handleSendOtp(
                      new Event('submit') as unknown as React.FormEvent,
                    );
                  }}
                >
                  Didn&apos;t receive a code? Resend
                </button>
              </form>
            </>
          )}

          {/* Step 3 — Email + Password */}
          {step === 'credentials' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
                  Set up your credentials
                </DialogTitle>
                <DialogDescription>
                  Phone verified ✓ Now enter your email and create a password.
                  You&apos;ll use these to log in.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateAccount} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm password</Label>
                  <Input
                    id="signup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gap-2 bg-[#271E5D] dark:bg-[#5D49D6] hover:bg-[#271E5D]/90 dark:hover:bg-[#5D49D6]/90"
                  disabled={
                    isLoading ||
                    !email ||
                    password.length < 8 ||
                    password !== confirmPassword
                  }
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
            </>
          )}

          {/* Step 4 — Verify email (HARD GATE) */}
          {step === 'verify-email' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
                  Verify your email
                </DialogTitle>
                <DialogDescription>
                  We&apos;ve sent a verification link to{' '}
                  <span className="font-medium text-foreground">{email}</span>.
                  Please check your inbox and click the link to continue.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="relative">
                    <Mail className="w-12 h-12 text-[#271E5D] dark:text-[#5D49D6]" />
                    <Loader2 className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6] animate-spin absolute -bottom-1 -right-1" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Waiting for you to confirm your email...
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    This page will automatically advance once verified.
                  </p>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Didn't receive the email? Resend"}
                </button>
              </div>
            </>
          )}

          {/* Step 5 — Location / Constituency mapping */}
          {step === 'location' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
                  Set your constituency
                </DialogTitle>
                <DialogDescription>
                  Email verified ✓ Select your INEC polling unit so we can map
                  you to your elected officials.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <Button
                  className="w-full gap-2 bg-[#271E5D] dark:bg-[#5D49D6] hover:bg-[#271E5D]/90 dark:hover:bg-[#5D49D6]/90"
                  onClick={() => setLocationOpen(true)}
                >
                  <MapPin className="w-4 h-4" />
                  Set up my location
                </Button>

                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleSkipLocation}
                >
                  Skip for now
                </button>
              </div>
            </>
          )}

          {/* Step 6 — Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-700">
                You&apos;re all set!
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Welcome to Electorate. Start tracking your representatives.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Location setup dialog (rendered outside the signup dialog) */}
      <LocationSetupDialog
        open={locationOpen}
        onOpenChange={setLocationOpen}
        profile={profile}
        canUpdate={true}
        onLocationSaved={handleLocationSaved}
      />
    </>
  );
}
