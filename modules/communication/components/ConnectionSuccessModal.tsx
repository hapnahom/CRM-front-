'use client';

import React from 'react';
import Image from 'next/image';

interface ConnectionSuccessModalProps {
  email: string;
  onClose: () => void;
}

export function ConnectionSuccessModal({
  email,
  onClose,
}: ConnectionSuccessModalProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white px-8 py-10 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex flex-col items-center gap-2">
          <Image
            src="/logo.png"
            alt="App logo"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
            priority
          />
          <p className="text-[13px] font-semibold tracking-wide text-foreground/80">
            Business
          </p>
        </div>
        <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
          Connection successful
        </h2>
        <p className="mt-3 text-[15px] text-foreground/85">
          <span className="font-medium">{email}</span> is now connected
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
