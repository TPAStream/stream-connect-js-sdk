import {
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Combobox as HCombobox
} from '@headlessui/react';
import { useId, useMemo, useState } from 'react';
import { ReactNode } from 'react';

export interface ComboboxItem {
  value: string | number;
  label: string;
}

interface ComboboxProps {
  items: ComboboxItem[];
  value: ComboboxItem | null;
  onChange: (item: ComboboxItem | null) => void;
  placeholder?: string;
  label?: ReactNode;
  emptyText?: string;
}

const ChevronDown = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="tpa-w-4 tpa-h-4"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
      clipRule="evenodd"
    />
  </svg>
);

const highlightMatch = (label: string, query: string): ReactNode => {
  // Replaces the legacy react-highlight-words. ~20 LOC inline.
  if (!query) return label;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = label.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="tpa-bg-amber-100 tpa-text-slate-900 tpa-rounded-sm"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

export const Combobox = ({
  items,
  value,
  onChange,
  placeholder,
  label,
  emptyText = 'No matches'
}: ComboboxProps) => {
  const [query, setQuery] = useState('');
  const id = useId();
  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="tpa-w-full">
      {label && (
        <label
          htmlFor={id}
          className="tpa-block tpa-text-sm tpa-font-medium tpa-text-slate-700 tpa-mb-1.5"
        >
          {label}
        </label>
      )}
      <HCombobox value={value} onChange={onChange} immediate>
        <div className="tpa-relative">
          <ComboboxInput
            id={id}
            placeholder={placeholder}
            displayValue={(it: ComboboxItem | null) => it?.label || ''}
            onChange={(e) => setQuery(e.target.value)}
            className="tpa-w-full tpa-rounded-md tpa-border tpa-border-slate-300 tpa-px-3 tpa-py-2.5 tpa-pr-10 tpa-text-base focus:tpa-outline-none focus-visible:tpa-border-primary-500 focus-visible:tpa-ring-2 focus-visible:tpa-ring-primary-500"
            // Suppress password manager popups (Bitwarden, 1Password,
            // LastPass) — this input is a search/picker, not a
            // credential field. `autoComplete="off"` covers most;
            // the data-* attrs are vendor-specific opt-outs that
            // Bitwarden, 1Password, LastPass, and Dashlane all read.
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
          />
          <ComboboxButton className="tpa-absolute tpa-inset-y-0 tpa-right-0 tpa-flex tpa-items-center tpa-pr-2 tpa-text-slate-400">
            <ChevronDown />
          </ComboboxButton>
          <ComboboxOptions className="tpa-absolute tpa-z-10 tpa-mt-1 tpa-w-full tpa-max-h-60 tpa-overflow-auto tpa-rounded-md tpa-bg-white tpa-shadow-card-hover tpa-border tpa-border-slate-200 tpa-py-1 tpa-text-sm">
            {filtered.length === 0 && (
              <div className="tpa-px-3 tpa-py-2 tpa-text-slate-500">
                {emptyText}
              </div>
            )}
            {filtered.map((it) => (
              <ComboboxOption
                key={it.value}
                value={it}
                className="tpa-px-3 tpa-py-2 tpa-cursor-pointer data-[focus]:tpa-bg-primary-50 data-[focus]:tpa-text-primary-700 data-[selected]:tpa-font-medium"
              >
                {highlightMatch(it.label, query)}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </div>
      </HCombobox>
    </div>
  );
};
