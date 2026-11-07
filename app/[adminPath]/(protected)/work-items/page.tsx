'use client';

import React, { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  UserCheck,
  CheckCircle2,
  Lock,
  ChevronRight,
  Clock,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AssignWorkModal } from '@/components/admin/assign-work-modal';
import { DeliverWorkModal } from '@/components/admin/deliver-work-modal';
import { EditWorkItemModal } from '@/components/admin/edit-work-item-modal';
import { getCachedData, setCachedData } from '@/lib/client-cache';
import { Pencil } from 'lucide-react';

interface WorkItem {
  id: string;
  itemNumber: string;
  title: string;
  description?: string;
  status: string;
  progressPercent: number;
  priority?: string;
  dueDate?: number | null;
  category?: string;
  source?: string;
  clientName?: string;
  assignedTo?: string | null;
  assignedByName?: string | null;
  assignedByRole?: string | null;
  assignedAt?: number | null;
  quotedPrice?: number | null;
  finalPrice?: number | null;
  currency?: string;
  paymentStatus?: string;
  invoiceReference?: string | null;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export default function WorkItemsPage(props: { params: Promise<{ adminPath: string }> }) {
  const { adminPath } = use(props.params);

  const cached = typeof window !== 'undefined' ? getCachedData<WorkItem[]>('work_items_all') : null;
  const [items, setItems] = useState<WorkItem[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [assignModalItem, setAssignModalItem] = useState<WorkItem | null>(null);
  const [deliverModalItem, setDeliverModalItem] = useState<WorkItem | null>(null);
  const [editModalItem, setEditModalItem] = useState<WorkItem | null>(null);

  const fetchItems = async (silent = false) => {
    try {
      if (!silent && !cached) setLoading(true);
      const res = await fetch('/api/admin/work-items?scope=all');
      if (res.ok) {
        const data = await res.json();
        const rows = data.workItems || [];
        setItems(rows);
        setCachedData('work_items_all', rows);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(Boolean(cached));
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.clientName && item.clientName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-[#12110b] dark:text-[#f4efea] flex items-center gap-2.5">
            <Briefcase className="h-6 w-6 text-[#ff4f31]" />
            Work Items & Delivery Hub
          </h1>
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1">
            Studio-wide project assignments, production progress, deliverables, and financial ledger.
          </p>
        </div>

        <a
          href={`/${adminPath}/intake`}
          className="h-10 px-4 rounded-full bg-[#ff4f31] hover:bg-[#e03d21] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Work Item</span>
        </a>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6265] dark:text-[#a09d93]" />
          <input
            type="text"
            placeholder="Search projects, client, item #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-[12px] bg-white dark:bg-[#181712] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'assigned', 'in_progress', 'in_review', 'completed', 'delivered'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize shrink-0 transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#12110b] text-white dark:bg-[#f4efea] dark:text-[#12110b]'
                  : 'bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] text-[#5a6265] dark:text-[#a09d93]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table */}
      {loading ? (
        <div className="rounded-[24px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] p-6 flex flex-col gap-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 w-full rounded-[14px] bg-black/[0.03] dark:bg-white/[0.04]" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 rounded-[24px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] text-center flex flex-col items-center">
          <Briefcase className="h-10 w-10 text-[#5a6265] dark:text-[#a09d93] mb-3 opacity-40" />
          <h3 className="text-base font-semibold">No work items found</h3>
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1 max-w-sm">
            Create an item from the Intake Inbox or convert an inquiry from the Leads pipeline.
          </p>
        </div>
      ) : (
        <div className="rounded-[24px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.01]">
                  <th className="py-3.5 px-4 font-semibold text-[#5a6265] dark:text-[#a09d93]">Item #</th>
                  <th className="py-3.5 px-4 font-semibold text-[#5a6265] dark:text-[#a09d93]">Project Title</th>
                  <th className="py-3.5 px-4 font-semibold text-[#5a6265] dark:text-[#a09d93]">Client</th>
                  <th className="py-3.5 px-4 font-semibold text-[#5a6265] dark:text-[#a09d93]">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-[#5a6265] dark:text-[#a09d93]">Progress</th>
                  <th className="py-3.5 px-4 font-semibold text-[#5a6265] dark:text-[#a09d93]">Financials</th>
                  <th className="py-3.5 px-4 font-semibold text-[#5a6265] dark:text-[#a09d93] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#ff4f31]">{item.itemNumber}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#12110b] dark:text-[#f4efea] block">{item.title}</span>
                      <span className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                        {item.category} • {item.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{item.clientName || 'Direct'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          item.status === 'delivered'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : item.status === 'completed'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                            : item.status === 'in_progress'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-black/5 dark:bg-white/10 text-[#5a6265] dark:text-[#a09d93]'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                          <div
                            style={{ width: `${item.progressPercent}%` }}
                            className="h-full bg-gradient-to-r from-[#ff4f31] to-emerald-500"
                          />
                        </div>
                        <span className="font-mono text-[11px]">{item.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.finalPrice ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {item.currency} {item.finalPrice.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93]">
                            Inv: {item.invoiceReference || 'N/A'}
                          </span>
                        </div>
                      ) : item.quotedPrice ? (
                        <span className="text-[#5a6265] dark:text-[#a09d93]">
                          Quote: {item.currency} {item.quotedPrice.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[#5a6265]/50 dark:text-[#a09d93]/50">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditModalItem(item)}
                          title="Edit Work Item"
                          className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-[#ff4f31] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        {item.status !== 'delivered' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setAssignModalItem(item)}
                              title="Assign Work"
                              className="px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-[#ff4f31] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Assign
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeliverModalItem(item)}
                              title="Deliver & Lock"
                              className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Deliver
                            </button>
                          </>
                        )}
                        {item.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                            <Lock className="h-3 w-3" />
                            Delivered
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Work Modal */}
      {assignModalItem && (
        <AssignWorkModal
          workItemId={assignModalItem.id}
          itemTitle={assignModalItem.title}
          itemNumber={assignModalItem.itemNumber}
          isOpen={!!assignModalItem}
          onClose={() => setAssignModalItem(null)}
          onAssigned={() => {
            fetchItems();
            setAssignModalItem(null);
          }}
        />
      )}

      {/* Deliver Work Modal */}
      {deliverModalItem && (
        <DeliverWorkModal
          workItemId={deliverModalItem.id}
          itemNumber={deliverModalItem.itemNumber}
          itemTitle={deliverModalItem.title}
          quotedPrice={deliverModalItem.quotedPrice || 0}
          currency={deliverModalItem.currency || 'INR'}
          isOpen={!!deliverModalItem}
          onClose={() => setDeliverModalItem(null)}
          onDelivered={() => {
            fetchItems();
            setDeliverModalItem(null);
          }}
        />
      )}

      {/* Super Admin Edit Work Item Modal */}
      {editModalItem && (
        <EditWorkItemModal
          workItemId={editModalItem.id}
          isOpen={!!editModalItem}
          onClose={() => setEditModalItem(null)}
          onUpdated={() => {
            fetchItems();
            setEditModalItem(null);
          }}
        />
      )}
    </div>
  );
}
