'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────
// Country list – dial code, ISO-2, flag emoji, name
// Ordered: Nigeria first, then popular, then alphabetical
// ──────────────────────────────────────────────
export interface Country {
  code: string;   // ISO-3166-1 alpha-2
  dial: string;   // e.g. "234"
  flag: string;   // emoji
  name: string;
}

const COUNTRIES: Country[] = [
  // ── Priority ──
  { code: 'NG', dial: '234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'GB', dial: '44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'US', dial: '1',   flag: '🇺🇸', name: 'United States' },
  { code: 'CA', dial: '1',   flag: '🇨🇦', name: 'Canada' },
  { code: 'GH', dial: '233', flag: '🇬🇭', name: 'Ghana' },
  { code: 'ZA', dial: '27',  flag: '🇿🇦', name: 'South Africa' },
  { code: 'KE', dial: '254', flag: '🇰🇪', name: 'Kenya' },
  { code: 'IN', dial: '91',  flag: '🇮🇳', name: 'India' },
  { code: 'AE', dial: '971', flag: '🇦🇪', name: 'UAE' },
  // ── Alphabetical ──
  { code: 'AF', dial: '93',  flag: '🇦🇫', name: 'Afghanistan' },
  { code: 'AL', dial: '355', flag: '🇦🇱', name: 'Albania' },
  { code: 'DZ', dial: '213', flag: '🇩🇿', name: 'Algeria' },
  { code: 'AO', dial: '244', flag: '🇦🇴', name: 'Angola' },
  { code: 'AR', dial: '54',  flag: '🇦🇷', name: 'Argentina' },
  { code: 'AU', dial: '61',  flag: '🇦🇺', name: 'Australia' },
  { code: 'AT', dial: '43',  flag: '🇦🇹', name: 'Austria' },
  { code: 'BH', dial: '973', flag: '🇧🇭', name: 'Bahrain' },
  { code: 'BD', dial: '880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: 'BE', dial: '32',  flag: '🇧🇪', name: 'Belgium' },
  { code: 'BJ', dial: '229', flag: '🇧🇯', name: 'Benin' },
  { code: 'BR', dial: '55',  flag: '🇧🇷', name: 'Brazil' },
  { code: 'BF', dial: '226', flag: '🇧🇫', name: 'Burkina Faso' },
  { code: 'CM', dial: '237', flag: '🇨🇲', name: 'Cameroon' },
  { code: 'TD', dial: '235', flag: '🇹🇩', name: 'Chad' },
  { code: 'CN', dial: '86',  flag: '🇨🇳', name: 'China' },
  { code: 'CO', dial: '57',  flag: '🇨🇴', name: 'Colombia' },
  { code: 'CD', dial: '243', flag: '🇨🇩', name: 'Congo (DRC)' },
  { code: 'CI', dial: '225', flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: 'HR', dial: '385', flag: '🇭🇷', name: 'Croatia' },
  { code: 'CZ', dial: '420', flag: '🇨🇿', name: 'Czech Republic' },
  { code: 'DK', dial: '45',  flag: '🇩🇰', name: 'Denmark' },
  { code: 'EG', dial: '20',  flag: '🇪🇬', name: 'Egypt' },
  { code: 'ET', dial: '251', flag: '🇪🇹', name: 'Ethiopia' },
  { code: 'FI', dial: '358', flag: '🇫🇮', name: 'Finland' },
  { code: 'FR', dial: '33',  flag: '🇫🇷', name: 'France' },
  { code: 'GA', dial: '241', flag: '🇬🇦', name: 'Gabon' },
  { code: 'GM', dial: '220', flag: '🇬🇲', name: 'Gambia' },
  { code: 'DE', dial: '49',  flag: '🇩🇪', name: 'Germany' },
  { code: 'GR', dial: '30',  flag: '🇬🇷', name: 'Greece' },
  { code: 'GN', dial: '224', flag: '🇬🇳', name: 'Guinea' },
  { code: 'HK', dial: '852', flag: '🇭🇰', name: 'Hong Kong' },
  { code: 'HU', dial: '36',  flag: '🇭🇺', name: 'Hungary' },
  { code: 'ID', dial: '62',  flag: '🇮🇩', name: 'Indonesia' },
  { code: 'IQ', dial: '964', flag: '🇮🇶', name: 'Iraq' },
  { code: 'IE', dial: '353', flag: '🇮🇪', name: 'Ireland' },
  { code: 'IL', dial: '972', flag: '🇮🇱', name: 'Israel' },
  { code: 'IT', dial: '39',  flag: '🇮🇹', name: 'Italy' },
  { code: 'JM', dial: '1',   flag: '🇯🇲', name: 'Jamaica' },
  { code: 'JP', dial: '81',  flag: '🇯🇵', name: 'Japan' },
  { code: 'JO', dial: '962', flag: '🇯🇴', name: 'Jordan' },
  { code: 'KW', dial: '965', flag: '🇰🇼', name: 'Kuwait' },
  { code: 'LR', dial: '231', flag: '🇱🇷', name: 'Liberia' },
  { code: 'LY', dial: '218', flag: '🇱🇾', name: 'Libya' },
  { code: 'MY', dial: '60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: 'ML', dial: '223', flag: '🇲🇱', name: 'Mali' },
  { code: 'MX', dial: '52',  flag: '🇲🇽', name: 'Mexico' },
  { code: 'MA', dial: '212', flag: '🇲🇦', name: 'Morocco' },
  { code: 'MZ', dial: '258', flag: '🇲🇿', name: 'Mozambique' },
  { code: 'NL', dial: '31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: 'NZ', dial: '64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: 'NE', dial: '227', flag: '🇳🇪', name: 'Niger' },
  { code: 'NO', dial: '47',  flag: '🇳🇴', name: 'Norway' },
  { code: 'OM', dial: '968', flag: '🇴🇲', name: 'Oman' },
  { code: 'PK', dial: '92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: 'PH', dial: '63',  flag: '🇵🇭', name: 'Philippines' },
  { code: 'PL', dial: '48',  flag: '🇵🇱', name: 'Poland' },
  { code: 'PT', dial: '351', flag: '🇵🇹', name: 'Portugal' },
  { code: 'QA', dial: '974', flag: '🇶🇦', name: 'Qatar' },
  { code: 'RO', dial: '40',  flag: '🇷🇴', name: 'Romania' },
  { code: 'RU', dial: '7',   flag: '🇷🇺', name: 'Russia' },
  { code: 'RW', dial: '250', flag: '🇷🇼', name: 'Rwanda' },
  { code: 'SA', dial: '966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'SN', dial: '221', flag: '🇸🇳', name: 'Senegal' },
  { code: 'SL', dial: '232', flag: '🇸🇱', name: 'Sierra Leone' },
  { code: 'SG', dial: '65',  flag: '🇸🇬', name: 'Singapore' },
  { code: 'SO', dial: '252', flag: '🇸🇴', name: 'Somalia' },
  { code: 'KR', dial: '82',  flag: '🇰🇷', name: 'South Korea' },
  { code: 'SS', dial: '211', flag: '🇸🇸', name: 'South Sudan' },
  { code: 'ES', dial: '34',  flag: '🇪🇸', name: 'Spain' },
  { code: 'SD', dial: '249', flag: '🇸🇩', name: 'Sudan' },
  { code: 'SE', dial: '46',  flag: '🇸🇪', name: 'Sweden' },
  { code: 'CH', dial: '41',  flag: '🇨🇭', name: 'Switzerland' },
  { code: 'TZ', dial: '255', flag: '🇹🇿', name: 'Tanzania' },
  { code: 'TH', dial: '66',  flag: '🇹🇭', name: 'Thailand' },
  { code: 'TG', dial: '228', flag: '🇹🇬', name: 'Togo' },
  { code: 'TT', dial: '1',   flag: '🇹🇹', name: 'Trinidad & Tobago' },
  { code: 'TN', dial: '216', flag: '🇹🇳', name: 'Tunisia' },
  { code: 'TR', dial: '90',  flag: '🇹🇷', name: 'Turkey' },
  { code: 'UG', dial: '256', flag: '🇺🇬', name: 'Uganda' },
  { code: 'UA', dial: '380', flag: '🇺🇦', name: 'Ukraine' },
  { code: 'VN', dial: '84',  flag: '🇻🇳', name: 'Vietnam' },
  { code: 'ZM', dial: '260', flag: '🇿🇲', name: 'Zambia' },
  { code: 'ZW', dial: '263', flag: '🇿🇼', name: 'Zimbabwe' },
];

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────
interface PhoneInputProps {
  /** The full E.164 phone value (e.g. "+2348012345678") */
  value: string;
  /** Called with the full E.164 string on every change */
  onChange: (value: string) => void;
  /** HTML id forwarded to the local-number input */
  id?: string;
  /** Placeholder for the local number field */
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  id,
  placeholder = '8012345678',
  autoFocus = false,
  disabled = false,
  className,
}: PhoneInputProps) {
  // Derive initial country + local from value
  const initialCountry = useMemo(() => {
    if (!value.startsWith('+')) return COUNTRIES[0]; // Nigeria
    const digits = value.slice(1);
    // Try 3-digit, 2-digit, 1-digit dial code
    for (const len of [3, 2, 1]) {
      const prefix = digits.slice(0, len);
      const match = COUNTRIES.find((c) => c.dial === prefix);
      if (match) return match;
    }
    return COUNTRIES[0];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initialLocal = useMemo(() => {
    if (!value.startsWith('+')) return value.replace(/^0+/, '');
    const digits = value.slice(1);
    return digits.slice(initialCountry.dial.length);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [country, setCountry] = useState<Country>(initialCountry);
  const [localNumber, setLocalNumber] = useState(initialLocal);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [dropdownOpen]);

  // Emit full E.164 whenever country or local changes
  const emitValue = (c: Country, local: string) => {
    const stripped = local.replace(/^0+/, '').replace(/\D/g, '');
    onChange(`+${c.dial}${stripped}`);
  };

  const handleLocalChange = (raw: string) => {
    // Strip non-digits and leading zeros — local numbers never start with 0
    // after the country code (e.g. UK: 07404… → 7404…, NG: 08012… → 8012…)
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
    setLocalNumber(digits);
    emitValue(country, digits);
  };

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setDropdownOpen(false);
    emitValue(c, localNumber);
  };

  const filtered = useMemo(() => {
    if (!search) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="flex">
        {/* Country code selector */}
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1 rounded-l-md border border-r-0 border-input bg-muted/50 px-2.5 py-2 text-sm hover:bg-muted transition-colors shrink-0',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          aria-label="Select country code"
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="font-medium text-foreground">+{country.dial}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {/* Local number input */}
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          placeholder={placeholder}
          value={localNumber}
          onChange={(e) => handleLocalChange(e.target.value)}
          autoFocus={autoFocus}
          disabled={disabled}
          className="rounded-l-none flex-1"
          maxLength={12}
        />
      </div>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-md border border-input bg-popover shadow-lg">
          {/* Search */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No results</p>
            )}
            {filtered.map((c) => (
              <button
                key={`${c.code}-${c.dial}`}
                type="button"
                onClick={() => handleCountrySelect(c)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors text-left',
                  c.code === country.code && c.dial === country.dial && 'bg-muted font-medium',
                )}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 truncate text-foreground">{c.name}</span>
                <span className="text-muted-foreground">+{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
