"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Sparkles, AlertCircle, Loader2, X, ArrowRight, ShieldCheck } from "lucide-react";
import { inAndroidApp, OUT_OF_CREDITS } from "@/lib/twa";

export interface CreditConfirmDetail {
  label: string;
  value: string;
}

export interface CreditConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  cost: number;
  costLabel?: string;
  badge?: string;
  details?: CreditConfirmDetail[];
  busy?: boolean;
}

export default function CreditConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle = "Please confirm before your credits are deducted.",
  cost,
  costLabel = "Paper generation fee",
  badge = "Credit Confirmation",
  details = [],
  busy = false,
}: CreditConfirmModalProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [wallet, setWallet] = useState<"personal" | "school">("personal");
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [inApp, setInApp] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setInApp(inAndroidApp());
    setLoadingBalance(true);
    let active = true;
    fetch("/api/credits/balance", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setBalance(typeof data.balance === "number" ? data.balance : 0);
        setWallet(data.wallet === "school" ? "school" : "personal");
      })
      .catch(() => {
        if (active) setBalance(null);
      })
      .finally(() => {
        if (active) setLoadingBalance(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const hasEnough = balance !== null ? balance >= cost : true;
  const balanceAfter = balance !== null ? Math.max(0, balance - cost) : null;

  return (
    <div className="fixed inset-0 z-[60] bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-rule shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-rule bg-paper/50 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pen/10 text-pen flex items-center justify-center shrink-0">
              <Coins size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-pen/10 text-pen rounded-full">
                  {badge}
                </span>
              </div>
              <p className="text-xs text-graphite mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-graphite hover:text-ink p-1 rounded-md transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-sm">
          {/* Paper Details Summary (if provided) */}
          {details.length > 0 && (
            <div className="bg-paper/60 border border-rule/70 rounded-xl p-3.5 space-y-1.5">
              <div className="text-[11px] font-semibold text-graphite uppercase tracking-wider mb-1">
                Paper Specifications
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {details.map((d, i) => (
                  <div key={i} className="min-w-0">
                    <span className="text-graphite block truncate">{d.label}:</span>
                    <span className="font-semibold text-ink truncate block">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Balance & Deduction Breakdown Card */}
          <div className="bg-white border-2 border-rule rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-graphite">
              <span>Your Current Balance:</span>
              <span className="font-semibold text-ink">
                {loadingBalance ? (
                  <Loader2 size={13} className="animate-spin inline" />
                ) : balance !== null ? (
                  `${Math.floor(balance / 20)} ${Math.floor(balance / 20) === 1 ? "paper" : "papers"}${wallet === "school" ? " (school pool)" : ""}`
                ) : (
                  "—"
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm py-1.5 border-y border-dashed border-rule">
              <span className="font-medium text-ink flex items-center gap-1.5">
                <Sparkles size={14} className="text-pen" />
                {costLabel}:
              </span>
              <span className="font-bold text-pen text-base">
                {cost === 0 ? "Free" : `-${Math.ceil(cost / 20)} paper`}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-graphite font-medium">Balance After:</span>
              <span
                className={`font-bold ${
                  hasEnough ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {loadingBalance ? (
                  <Loader2 size={13} className="animate-spin inline" />
                ) : balanceAfter !== null ? (
                  `${Math.floor(balanceAfter / 20)} ${Math.floor(balanceAfter / 20) === 1 ? "paper" : "papers"} remaining`
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>

          {/* Insufficient Balance State */}
          {!loadingBalance && balance !== null && !hasEnough && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold">No Papers Remaining</p>
                <p className="mt-0.5 text-red-600 leading-relaxed">
                  {inApp === false
                    ? "You've used all papers in your pack. Get 5 more papers for just ₹29."
                    : OUT_OF_CREDITS}
                </p>
              </div>
            </div>
          )}

          {/* Transparency note: Editing & Downloading is 100% Free */}
          <div className="flex items-start gap-2 text-[12px] text-graphite leading-relaxed bg-amber-50/60 border border-amber-200/60 rounded-xl p-3">
            <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>No hidden charges:</strong> Credits are only spent when generating new questions. Once created, editing questions, rearranging sections, and downloading unlimited PDFs is completely <strong>free</strong>.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-5 bg-paper/40 border-t border-rule flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-graphite hover:text-ink hover:bg-rule rounded-lg transition-colors disabled:opacity-40"
          >
            Cancel
          </button>

          {!loadingBalance && balance !== null && !hasEnough ? (
            inApp === false ? (
              <Link
                href="/topup"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold bg-pen text-white rounded-lg hover:bg-ink transition-colors shadow-xs"
              >
                <span>Buy Credits</span>
                <ArrowRight size={15} />
              </Link>
            ) : null
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || loadingBalance || !hasEnough}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-pen text-white rounded-lg hover:bg-ink transition-colors disabled:opacity-50 shadow-xs active:scale-95"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating paper…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Confirm &amp; Spend {cost} Credits
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
