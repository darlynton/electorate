'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Mail,
  Phone,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  LogIn,
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
import {
  signInWithPassword,
  resetPassword,
  resolvePhoneToEmail,
} from '@/lib/use-auth';

interface LoginDialogProps {
  triggerLabel?: string;
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Step = 'login' | 'forgot-password' | 'reset-sent';
type LoginMode = 'email' | 'phone';

export function LoginDialog({
  triggerLabel = 'Log In',
  triggerClassName,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: LoginDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [step, setStep] = useState<Step>('login');
  const [loginMode, setLoginMode] = useState<LoginMode>('email');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const reset = useCallback(() => {
    setStep('login');
    setLoginMode('email');
    setEmailInput('');
    setPhoneInput('');
    setPassword('');
    setShowPassword(false);
    setError(null);
    setForgotEmail('');
    setIsLoading(false);
    setResendCooldown(0);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // -------------------------------------------------------
  // Login handler
  // -------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let loginEmail = emailInput;

      // If using phone mode, resolve phone → email
      if (loginMode === 'phone') {
        const { email: resolved, error: resolveError } =
          await resolvePhoneToEmail(phoneInput);
        if (resolveError || !resolved) {
          setError(resolveError ?? 'No account found for this phone number');
          setIsLoading(false);
          return;
        }
        loginEmail = resolved;
      }

      const { error: signInError } = await signInWithPassword(
        loginEmail,
        password,
      );

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      // Success — close dialog
      onOpenChange(false);
      reset();
    } catch {
      setError('Something went wrong — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------
  // Forgot password handler
  // -------------------------------------------------------
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: resetError } = await resetPassword(forgotEmail);
      if (resetError) {
        setError(resetError.message);
        setIsLoading(false);
        return;
      }
      setStep('reset-sent');
      setResendCooldown(60);
    } catch {
      setError('Something went wrong — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      {triggerLabel && (
        <DialogTrigger
          className={
            triggerClassName ??
            'inline-flex items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted transition-colors'
          }
        >
          <LogIn className="w-4 h-4" />
          {triggerLabel}
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md">
        {/* Login form */}
        {step === 'login' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LogIn className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
                Welcome back
              </DialogTitle>
              <DialogDescription>
                Sign in with your email or phone number.
              </DialogDescription>
            </DialogHeader>

            {/* Toggle: Email / Phone */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  loginMode === 'email'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setLoginMode('email');
                  setError(null);
                }}
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  loginMode === 'phone'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setLoginMode('phone');
                  setError(null);
                }}
              >
                <Phone className="w-3.5 h-3.5" />
                Phone
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 pt-1">
              {loginMode === 'email' ? (
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="login-phone">Phone number</Label>
                  <PhoneInput
                    id="login-phone"
                    value={phoneInput}
                    onChange={(val) => setPhoneInput(val)}
                    autoFocus
                    placeholder="8012345678"
                  />
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll look up the email linked to this number.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                  (loginMode === 'email' ? !emailInput : phoneInput.replace(/\D/g, '').length < 10) ||
                  !password
                }
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setStep('forgot-password');
                  setForgotEmail(loginMode === 'email' ? emailInput : '');
                  setError(null);
                }}
              >
                Forgot your password?
              </button>
            </form>
          </>
        )}

        {/* Forgot password form */}
        {step === 'forgot-password' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
                Reset password
              </DialogTitle>
              <DialogDescription>
                Enter your email address and we&apos;ll send you a password
                reset link.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoFocus
                  required
                />
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
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    setStep('login');
                    setError(null);
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gap-2 bg-[#271E5D] dark:bg-[#5D49D6] hover:bg-[#271E5D]/90 dark:hover:bg-[#5D49D6]/90"
                  disabled={isLoading || !forgotEmail}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {isLoading ? 'Sending...' : 'Send reset link'}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Reset email sent confirmation */}
        {step === 'reset-sent' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
                Check your inbox
              </DialogTitle>
              <DialogDescription>
                We&apos;ve sent a password reset link to{' '}
                <span className="font-medium text-foreground">
                  {forgotEmail}
                </span>
                . Click the link to set a new password.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  setStep('login');
                  setError(null);
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
