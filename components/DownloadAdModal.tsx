"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  X,
  FileDown,
  Printer,
  Share2,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import AdBanner from "./AdBanner";
import Link from "next/link";

export type ExportFormat = "pdf" | "docx" | "share" | "print";

interface DownloadAdModalProps {
  isOpen: boolean;
  format: ExportFormat;
  paperTitle?: string;
  onComplete: () => void;
  onClose: () => void;
  isPaid?: boolean;
}

const FORMAT_CONFIG: Record<
  ExportFormat,
  { label: string; actionText: string; icon: React.ReactNode; color: string }
> = {
  pdf: {
    label: "PDF Exam Paper",
    actionText: "Download PDF",
    icon: <FileText size={22} className="text-red-500" />,
    color: "bg-red-50 border-red-200 text-red-700",
  },
  docx: {
    label: "Editable Word File (.docx)",
    actionText: "Download Word",
    icon: <FileDown size={22} className="text-blue-600" />,
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  share: {
    label: "Shareable PDF",
    actionText: "Share PDF",
    icon: <Share2 size={22} className="text-emerald-600" />,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  print: {
    label: "Print Document",
    actionText: "Open Print View",
    icon: <Printer size={22} className="text-slate-700" />,
    color: "bg-slate-50 border-slate-200 text-slate-700",
  },
};

export default function DownloadAdModal({
  isOpen,
  format,
  paperTitle,
  onComplete,
  onClose,
  isPaid = false,
}: DownloadAdModalProps) {
  // If user is paid, this modal shouldn't render, but safety check:
  useEffect(() => {
    if (isOpen && isPaid) {
      onComplete();
    }
  }, [isOpen, isPaid, onComplete]);

  const [secondsLeft, setSecondsLeft] = useState(5);
  const [completed, setCompleted] = useState(false);
  const completedRef = useRef(false);

  // Reset timer on open
  useEffect(() => {
    if (!isOpen || isPaid) return;
    setSecondsLeft(5);
    setCompleted(false);
    completedRef.current = false;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!completedRef.current) {
            completedRef.current = true;
            setCompleted(true);
            // Slight delay so the user sees "Ready!" before the download dialog/share opens
            setTimeout(() => {
              onComplete();
            }, 600);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isPaid, onComplete]);

  if (!isOpen || isPaid) return null;

  const cfg = FORMAT_CONFIG[format] || FORMAT_CONFIG.pdf;
  const progressPercent = Math.min(100, Math.round(((5 - secondsLeft) / 5) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rule/80 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Top Header */}
        <div className="p-5 pb-4 border-b border-rule flex items-start justify-between gap-3 bg-paper-warm/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white border border-rule/80 shadow-xs flex items-center justify-center shrink-0">
              {cfg.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase font-semibold text-graphite tracking-wide">
                Preparing Export
              </div>
              <h3 className="text-base font-bold text-ink truncate leading-tight mt-0.5">
                {paperTitle || cfg.label}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-graphite hover:text-ink hover:bg-rule/60 rounded-xl transition-colors shrink-0"
            title="Cancel"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Timer and Progress */}
          <div className="bg-paper-warm/50 border border-rule/80 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {completed ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold animate-pulse">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Starting download...
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink/10 text-ink text-xs font-semibold">
                  <Clock size={13} className="text-pen" />
                  <span>
                    Download starting in{" "}
                    <strong className="text-pen text-sm font-bold">
                      {secondsLeft}s
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-rule/70 h-2.5 rounded-full overflow-hidden my-2.5">
              <div
                className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                  completed ? "bg-emerald-500" : "bg-pen"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-graphite">
              {completed
                ? "Your document is ready and downloading now!"
                : "Thank you for using TeacherEase free edition. Preparing your high-resolution layout..."}
            </p>
          </div>

          {/* AdSense Placement */}
          <div className="min-h-[140px] flex items-center justify-center">
            <AdBanner
              slot={process.env.NEXT_PUBLIC_ADSENSE_DOWNLOAD_SLOT}
              format="rectangle"
              isPaid={false}
              label="Sponsored Advertisement"
              className="w-full my-0"
            />
          </div>

          {/* Action button */}
          <div className="pt-1">
            <button
              onClick={() => {
                if (completed || secondsLeft === 0) {
                  onComplete();
                }
              }}
              disabled={secondsLeft > 0 && !completed}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                completed || secondsLeft === 0
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-98 cursor-pointer"
                  : "bg-rule/70 text-graphite/80 cursor-not-allowed"
              }`}
            >
              {completed || secondsLeft === 0 ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>{cfg.actionText} Ready</span>
                </>
              ) : (
                <>
                  <Clock size={16} className="animate-spin text-graphite" />
                  <span>Please wait ({secondsLeft}s)...</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pro Upsell Footer */}
        <div className="p-3.5 bg-gradient-to-r from-pen/[0.04] to-pen/[0.08] border-t border-rule text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-graphite">
            <Sparkles size={13} className="text-pen" />
            <span>Want instant downloads without ads or watermarks?</span>
            <Link
              href="/pricing"
              target="_blank"
              className="text-pen font-semibold hover:underline inline-flex items-center gap-0.5 ml-1"
            >
              Go Pro <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
