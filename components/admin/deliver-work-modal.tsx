'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Lock, DollarSign, AlertCircle, FileCheck, IndianRupee, X } from 'lucide-react';

interface DeliverWorkModalProps {
  workItemId: string;
  itemNumber: string;
  itemTitle: string;
  quotedPrice?: number;
  currency?: string;
  isOpen: boolean;
  onClose: () => void;
  onDelivered: () => void;
}

export function DeliverWorkModal({
  workItemId,
  itemNumber,
  itemTitle,
  quotedPrice = 0,
  currency = 'INR',
  isOpen,
  onClose,
  onDelivered,
}: DeliverWorkModalProps) {
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [finalPrice, setFinalPrice] = useState<number>(quotedPrice || 0);
  const [discount, setDiscount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(18);
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partially_paid' | 'paid'>('paid');
  const [amountReceived, setAmountReceived] = useState<number>(quotedPrice || 0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer (NEFT/IMPS)');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const balanceDue = Math.max(0, finalPrice - amountReceived);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalPrice || finalPrice <= 0) {
      setError('Final price is mandatory and must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/admin/work-items/${workItemId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDate: new Date(deliveryDate).getTime(),
          finalPrice,
          currency,
          paymentStatus,
          amountReceived,
          discount,
          taxPercent,
          paymentMethod,
          deliveryNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to mark as delivered');
      }

      onDelivered();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delivery failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[28px] bg-[#181712] border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col gap-5 text-[#f4efea]"
      >
        <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#ff4f31]">{itemNumber}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 uppercase">
                Mark as Delivered & Lock
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight mt-1 text-white">Final Delivery & Financial Ledger</h2>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-all cursor-pointer z-30"
          >
            <X className="h-4 w-4 pointer-events-none" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Delivery Date</label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Final Price ({currency}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={finalPrice}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setFinalPrice(val);
                  if (paymentStatus === 'paid') setAmountReceived(val);
                }}
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs font-semibold outline-none focus:border-[#ff4f31]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => {
                  const val = e.target.value as 'unpaid' | 'partially_paid' | 'paid';
                  setPaymentStatus(val);
                  if (val === 'paid') setAmountReceived(finalPrice);
                  else if (val === 'unpaid') setAmountReceived(0);
                }}
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              >
                <option value="paid">Paid Full</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Amount Received ({currency})</label>
              <input
                type="number"
                min="0"
                max={finalPrice}
                value={amountReceived}
                onChange={(e) => setAmountReceived(parseInt(e.target.value, 10) || 0)}
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Method</label>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="Bank Transfer, Stripe, UPI..."
                className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Balance Due</label>
              <div className="w-full h-10 px-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] text-xs font-mono font-bold flex items-center text-rose-500">
                {currency} {balanceDue.toLocaleString()}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Delivery Handover Notes</label>
            <textarea
              rows={2}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Delivery link, final asset bundle, client sign-off notes..."
              className="w-full p-2.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31] resize-none"
            />
          </div>

          <div className="p-3.5 rounded-[14px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              Marking this item as <strong>Delivered</strong> locks all fields permanently. Editing requires explicit administrative permission.
            </span>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-full border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitting ? 'Locking...' : 'Deliver & Lock'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
