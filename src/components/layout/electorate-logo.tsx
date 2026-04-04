import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ElectorateLogoProps {
  /** Show full wordmark or icon only */
  variant?: 'full' | 'icon';
  /** Color scheme */
  theme?: 'brand' | 'white';
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ElectorateLogo({
  variant = 'full',
  theme = 'brand',
  size = 'md',
  className,
}: ElectorateLogoProps) {
  const sizes = {
    sm: { width: 120, height: 18 },
    md: { width: 160, height: 24 },
    lg: { width: 210, height: 31 },
  };

  const s = sizes[size];

  return (
    <span className={cn('inline-flex items-center', className)}>
      {theme === 'white' ? (
        <Image
          src="/logo-white.svg"
          alt="Electorate"
          width={s.width}
          height={s.height}
          priority
          className={cn('h-auto max-w-full', variant === 'icon' ? 'w-8' : undefined)}
        />
      ) : (
        <>
          <Image
            src="/logo.svg"
            alt="Electorate"
            width={s.width}
            height={s.height}
            priority
            className={cn('h-auto max-w-full dark:hidden', variant === 'icon' ? 'w-8' : undefined)}
          />
          <Image
            src="/logo-white.svg"
            alt="Electorate"
            width={s.width}
            height={s.height}
            priority
            className={cn('hidden h-auto max-w-full dark:block', variant === 'icon' ? 'w-8' : undefined)}
          />
        </>
      )}
    </span>
  );
}
