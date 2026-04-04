'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Building2, User } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import type { Politician, Position } from '@/types';

interface SearchResult {
  politician: Politician;
  position?: Position;
}

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({ placeholder = "Search politicians...", className }: SearchBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchPoliticians = useDebouncedCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery)}&limit=8`);
      if (response.ok) {
        const data = await response.json();
        const politicians: Array<{
          id: string;
          slug: string;
          full_name: string;
          state_of_origin: string;
          photo_url?: string;
          position?: { title: string; party: string; chamber: string };
        }> = data.data?.politicians || [];
        setResults(
          politicians.map((p) => ({
            politician: p as unknown as Politician,
            position: p.position as unknown as Position | undefined,
          }))
        );
        setOpen(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      searchPoliticians(value);
    } else {
      setOpen(false);
      setResults([]);
    }
  };

  const handleSelect = (slug: string) => {
    setOpen(false);
    setQuery('');
    router.push(`/politicians/${slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.length >= 2) {
      setOpen(false);
      router.push(`/politicians?search=${encodeURIComponent(query)}`);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPartyColor = (party: string) => {
    const colors: Record<string, string> = {
      APC: 'bg-[#271E5D] text-white',
      PDP: 'bg-[#E84C30] text-white',
      LP: 'bg-[#00C49A] text-white',
      NNPP: 'bg-[#5D49D6] text-white',
    };
    return colors[party] || 'bg-gray-500 text-white';
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-4 h-12 text-base bg-card text-foreground placeholder:text-muted-foreground border-2 border-border focus:border-[#271E5D] dark:focus:border-[#5D49D6] rounded-xl w-full"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <motion.div
              className="w-5 h-5 border-2 border-[#271E5D] dark:border-[#5D49D6] border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {open && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl border border-border shadow-lg z-50 overflow-hidden"
          >
            {/* Loading state */}
            {isLoading && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}

            {/* No results */}
            {!isLoading && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No officials found for &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Results list */}
            {results.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border bg-muted">
                  Officials
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {results.map((result) => (
                    <button
                      key={result.politician.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(result.politician.slug);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#271E5D]/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-lg bg-[#271E5D]/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                          {result.politician.photo_url ? (
                            <img
                              src={result.politician.photo_url}
                              alt={result.politician.full_name}
                              className="w-full h-full rounded-lg object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">
                              {result.politician.full_name}
                            </span>
                            {result.position && (
                              <Badge className={`${getPartyColor(result.position.party)} text-xs px-1.5 py-0`}>
                                {result.position.party}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {result.politician.state_of_origin}
                            </span>
                            {result.position && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {result.position.chamber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* View all link */}
                <div className="p-2 border-t">
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setOpen(false);
                      router.push(`/politicians?search=${encodeURIComponent(query)}`);
                    }}
                    className="w-full text-center text-sm text-[#271E5D] dark:text-[#5D49D6] hover:underline py-2"
                  >
                    View all results for &ldquo;{query}&rdquo;
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
