import Link from 'next/link';

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function TermsCheckbox({ checked, onChange }: TermsCheckboxProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
          checked
            ? 'bg-blue-500 border-blue-500'
            : 'bg-white/[0.05] border-white/20 hover:border-blue-500/50'
        }`}
        aria-checked={checked}
        role="checkbox"
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      <p
        className="text-xs text-gray-400 cursor-pointer select-none leading-relaxed"
        onClick={() => onChange(!checked)}
      >
        I agree to the{' '}
        <Link href="/terms" target="_blank" className="text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>
          Terms and Conditions
        </Link>
        {' '}and Privacy Policy
      </p>
    </div>
  );
}
