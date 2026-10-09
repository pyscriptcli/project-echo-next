interface MosaicBrandProps {
  className?: string;
  compact?: boolean;
  size?: "small" | "medium" | "large";
}

const sizes = {
  small: { mark: "h-7 w-7", word: "text-[11px]", tagline: "text-[7px]" },
  medium: { mark: "h-9 w-9", word: "text-xs", tagline: "text-[8px]" },
  large: { mark: "h-12 w-12", word: "text-base", tagline: "text-[9px]" },
};

export function MosaicBrand({ className = "", compact = false, size = "medium" }: MosaicBrandProps) {
  const scale = sizes[size];

  return (
    <div role="img" aria-label="Mosaic — Work, Connected" className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mosaic-app-icon.svg" alt="" className={`${scale.mark} shrink-0 object-contain`} />
      {!compact && <span className="min-w-0 leading-none">
        <strong className={`block truncate font-sans font-semibold tracking-[0.16em] ${scale.word}`}>MOSAIC</strong>
        <span className={`mt-1 block whitespace-nowrap font-sans font-medium tracking-[0.18em] ${scale.tagline}`}>WORK, CONNECTED</span>
      </span>}
    </div>
  );
}
