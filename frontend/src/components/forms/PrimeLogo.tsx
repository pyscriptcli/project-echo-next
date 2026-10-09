"use client";

import React from "react";

interface PrimeLogoProps {
  className?: string;
}

export function PrimeLogo({ className = "h-11" }: PrimeLogoProps) {
  return (
    <div className={`flex items-center justify-end select-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mosaic-logo-horizontal.svg"
        alt="Mosaic — Work, Connected"
        className="h-full w-auto object-contain"
      />
    </div>
  );
}

