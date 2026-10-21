"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface AdBannerProps {
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical" | "fluid";
  responsive?: boolean;
  isPaid?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export default function AdBanner({
  slot,
  format = "auto",
  responsive = true,
  isPaid = false,
  className = "",
  style,
  label,
}: AdBannerProps) {
  // Never show ads to paid teachers
  if (isPaid) {
    return null;
  }

  const clientId =
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-1963220156593983";
  const isPushed = useRef(false);

  useEffect(() => {
    if (!clientId || isPaid || isPushed.current) return;
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isPushed.current = true;
      }
    } catch (err) {
      console.warn("AdSense push exception:", err);
    }
  }, [clientId, isPaid]);

  // If AdSense client ID is configured, render official AdSense unit
  if (clientId) {
    return (
      <div
        className={`ad-banner-container no-print my-3 text-center overflow-hidden rounded-xl border border-rule/60 bg-paper-warm/40 p-2 ${className}`}
        style={style}
      >
        {label && (
          <div className="text-[10px] uppercase font-semibold text-graphite/60 tracking-wider mb-1.5">
            {label}
          </div>
        )}
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: "90px", ...style }}
          data-ad-client={clientId}
          data-ad-slot={slot || undefined}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      </div>
    );
  }

  // Graceful fallback for local development or pending AdSense domain approval
  return (
    <div
      className={`ad-banner-container no-print my-3 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-amber-100/50 p-4 text-center shadow-xs ${className}`}
      style={style}
    >
      <div className="flex items-center justify-center gap-1.5 mb-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
          <Sparkles size={11} className="text-amber-700" />
          Sponsored
        </span>
      </div>
      <div className="text-sm font-semibold text-ink">
        TeacherEase Pro for Teachers & Schools
      </div>
      <p className="text-xs text-graphite mt-1 max-w-sm mx-auto leading-relaxed">
        Download instant papers with zero wait time, no watermarks, and monthly AI generation credits.
      </p>
      <div className="mt-2.5">
        <Link
          href="/pricing"
          target="_blank"
          className="inline-flex items-center gap-1 text-xs font-semibold text-pen hover:underline"
        >
          Explore Pro Plans &rarr;
        </Link>
      </div>
    </div>
  );
}
