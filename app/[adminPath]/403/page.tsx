'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

export default function ForbiddenPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);

  return (
    <div className="min-h-screen w-full bg-[#12110b] text-[#f4efea] flex items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-[#ff4f31]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md rounded-[24px] bg-[#1a1914]/90 border border-white/10 p-8 shadow-2xl relative z-10 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-inner">
          <ShieldAlert className="h-7 w-7 stroke-[2.2]" />
        </div>

        <span className="text-[11px] font-bold tracking-widest uppercase text-rose-400 mb-1">
          Error 403 • Authorization Required
        </span>

        <h1 className="text-[24px] font-bold tracking-tight mb-2">
          Access Restricted
        </h1>

        <p className="text-xs text-[#a09d93] leading-relaxed mb-6">
          Your account role does not have permission to view or manage this administrative sector.
          Contact the Super Admin to request elevated role privileges or lead scope adjustments.
        </p>

        <div className="p-3.5 rounded-[14px] bg-white/[0.03] border border-white/5 w-full mb-6 text-left flex items-start gap-3">
          <Lock className="h-4 w-4 text-[#ff4f31] shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-[#8e8a7f]">
            This security boundary is enforced strictly server-side at the query level to safeguard client confidentiality.
          </p>
        </div>

        <Link
          href={`/${adminPath}`}
          className="w-full h-[46px] rounded-full bg-[#f4efea] text-[#12110b] hover:bg-[#ff4f31] hover:text-white font-semibold text-xs tracking-tight transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
