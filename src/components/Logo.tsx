import Link from "next/link";

type LogoProps = {
  href?: string;
  textClassName?: string;
  className?: string;
  size?: number;
};

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64"
      fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <rect width="64" height="64" rx="15" fill="var(--color-paper, #f6f4ef)" />
      <rect x="10.5" y="9" width="29" height="46" rx="7.5"
        stroke="var(--color-ink, #16233d)" strokeWidth="5" />
      <rect x="20" y="8.5" width="10" height="3" rx="1.5"
        fill="var(--color-ink, #16233d)" />
      <path d="M28.5 17.5L18 35h8l-2.5 12L36 29h-8l.5-11.5Z"
        fill="var(--color-brand, #f97316)" />
      <path d="M42.5 28.5L55 32.5v8.3c0 7.3-4.4 12.2-12.5 15.1C34.4 53 30 48.1 30 40.8v-8.3l12.5-4Z"
        fill="var(--color-brand, #f97316)" />
      <path d="m36.5 40.5 4 4 7.5-8" stroke="#fff" strokeWidth="3.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 9.5c-3.2 0-5.5 2.5-5.5 5.7v5.1l-2.3 3.6h15.6l-2.3-3.6v-5.1c0-3.2-2.3-5.7-5.5-5.7Z"
        fill="var(--color-brand, #f97316)" />
      <path d="M57 11.5 60 8.5M58.5 17h4" stroke="var(--color-brand, #f97316)"
        strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Recharge Guard's brand mark: a small ink badge holding an amber + teal dot
 * pair, followed by the "Recharge Guard" wordmark. Shared by the landing page,
 * login screen and the signed-in TopNav.
 */
export function Logo({
  href,
  textClassName = "text-lg",
  className = "",
  size = 32,
}: LogoProps) {
  const mark = (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span
        className={`font-display font-semibold text-ink tracking-[-0.02em] whitespace-nowrap ${textClassName}`}
      >
        Recharge Guard
      </span>
    </div>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex items-center cursor-pointer">
      {mark}
    </Link>
  );
}