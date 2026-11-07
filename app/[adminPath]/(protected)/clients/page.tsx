'use client';

import React, { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building,
  FileText,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Briefcase,
  X,
  CreditCard,
} from 'lucide-react';
import { getCachedData, setCachedData } from '@/lib/client-cache';

interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  billingAddress?: string | null;
  gstin?: string | null;
  notes?: string | null;
  createdAt: number;
  updatedAt: number;
}

export default function ClientsPage(props: { params: Promise<{ adminPath: string }> }) {
  const { adminPath } = use(props.params);

  const cached = typeof window !== 'undefined' ? getCachedData<Client[]>('clients_list') : null;
  const [clients, setClients] = useState<Client[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddOpen) setIsAddOpen(false);
        if (selectedClient) setSelectedClient(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddOpen, selectedClient]);

  const fetchClients = async (silent = false) => {
    try {
      if (!silent && !cached) setLoading(true);
      const res = await fetch(`/api/admin/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      if (!res.ok) throw new Error('Failed to load clients');
      const data = await res.json();
      const rows = data.clients || [];
      setClients(rows);
      if (!search) setCachedData('clients_list', rows);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients(Boolean(cached) && !search);
  }, [search]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Client or brand name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
          billingAddress: billingAddress.trim() || undefined,
          gstin: gstin.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client');

      setSuccess('Client profile created successfully.');
      setTimeout(() => {
        setIsAddOpen(false);
        setSuccess(null);
        setName('');
        setEmail('');
        setPhone('');
        setCompany('');
        setBillingAddress('');
        setGstin('');
        setNotes('');
        fetchClients();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#ff4f31] uppercase">
            <Users className="w-3.5 h-3.5" />
            <span>Studio Directory</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-white mt-1">Client Directory</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Centralized directory of brand partners, client contacts, and invoicing tax credentials.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff4f31] text-white text-sm font-medium hover:bg-[#ff3b1a] transition-all shadow-lg shadow-[#ff4f31]/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 backdrop-blur-sm">
          <div className="text-xs text-neutral-400 font-mono">TOTAL CLIENTS</div>
          <div className="text-2xl font-light text-white mt-1">{clients.length}</div>
        </div>
        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 backdrop-blur-sm">
          <div className="text-xs text-neutral-400 font-mono">BILLING PROFILES (GST)</div>
          <div className="text-2xl font-light text-[#ff4f31] mt-1">
            {clients.filter((c) => !!c.gstin).length}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 backdrop-blur-sm">
          <div className="text-xs text-neutral-400 font-mono">ENTERPRISE ACCOUNTS</div>
          <div className="text-2xl font-light text-white mt-1">
            {clients.filter((c) => !!c.company).length}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-[#ff4f31] transition-all"
          />
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-neutral-900/30 border border-neutral-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-neutral-900/30 border border-neutral-800/80">
          <Users className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <div className="text-neutral-300 font-medium">No clients found</div>
          <div className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {search ? 'No clients match your search filter.' : 'Add your first client to start organizing work items and billing records.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <motion.div
              key={client.id}
              layout
              onClick={() => setSelectedClient(client)}
              className="group p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer backdrop-blur-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ff4f31]/10 text-[#ff4f31] border border-[#ff4f31]/20 flex items-center justify-center font-medium text-sm">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-base group-hover:text-[#ff4f31] transition-colors">
                        {client.name}
                      </h3>
                      {client.company && (
                        <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                          <Building className="w-3 h-3 text-neutral-500" />
                          <span>{client.company}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {client.gstin && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      GST
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-neutral-400">
                  {client.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-500">
                <span>Added {new Date(client.createdAt).toLocaleDateString()}</span>
                <span className="text-[#ff4f31] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div
            onClick={() => setIsAddOpen(false)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                aria-label="Close modal"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAddOpen(false);
                }}
                className="absolute top-5 right-5 h-9 w-9 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-all cursor-pointer z-30"
              >
                <X className="w-4 h-4 pointer-events-none" />
              </button>

              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#ff4f31] mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>New Client</span>
              </div>
              <h2 className="text-xl font-light text-white mb-4">Add Client Profile</h2>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleCreateClient} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    CLIENT / BRAND NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Media or John Doe"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-[#ff4f31]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1">COMPANY</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Organization Ltd."
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-[#ff4f31]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1">GSTIN / TAX ID</label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="27AAAPL1234C1Z5"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-[#ff4f31]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1">EMAIL</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@brand.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-[#ff4f31]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1">PHONE</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-[#ff4f31]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    BILLING ADDRESS
                  </label>
                  <textarea
                    rows={2}
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Full registered address for invoices"
                    className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-[#ff4f31] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">INTERNAL NOTES</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special requirements, communication preferences..."
                    className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-[#ff4f31] resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 text-xs font-medium hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-[#ff4f31] text-white text-xs font-medium hover:bg-[#ff3b1a] disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Save Client'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Client Detail Drawer / Modal */}
      <AnimatePresence>
        {selectedClient && (
          <div
            onClick={() => setSelectedClient(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative"
            >
              <button
                type="button"
                aria-label="Close client details"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedClient(null);
                }}
                className="absolute top-5 right-5 h-9 w-9 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-all cursor-pointer z-30"
              >
                <X className="w-4 h-4 pointer-events-none" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#ff4f31]/10 text-[#ff4f31] border border-[#ff4f31]/20 flex items-center justify-center font-medium text-base">
                  {selectedClient.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-light text-white">{selectedClient.name}</h2>
                  {selectedClient.company && (
                    <div className="text-xs text-neutral-400">{selectedClient.company}</div>
                  )}
                </div>
              </div>

              <div className="space-y-3 py-3 border-y border-neutral-800 text-sm">
                {selectedClient.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-500">EMAIL</span>
                    <a
                      href={`mailto:${selectedClient.email}`}
                      className="text-neutral-200 hover:text-[#ff4f31] flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {selectedClient.email}
                    </a>
                  </div>
                )}
                {selectedClient.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-500">PHONE</span>
                    <a
                      href={`tel:${selectedClient.phone}`}
                      className="text-neutral-200 hover:text-[#ff4f31] flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {selectedClient.phone}
                    </a>
                  </div>
                )}
                {selectedClient.gstin && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-500">GSTIN / TAX ID</span>
                    <span className="font-mono text-neutral-200">{selectedClient.gstin}</span>
                  </div>
                )}
                {selectedClient.billingAddress && (
                  <div>
                    <span className="text-xs font-mono text-neutral-500 block mb-1">BILLING ADDRESS</span>
                    <p className="text-xs text-neutral-300 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                      {selectedClient.billingAddress}
                    </p>
                  </div>
                )}
                {selectedClient.notes && (
                  <div>
                    <span className="text-xs font-mono text-neutral-500 block mb-1">NOTES</span>
                    <p className="text-xs text-neutral-300 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                      {selectedClient.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setSelectedClient(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium hover:bg-neutral-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
