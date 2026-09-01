"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptTeamInviteAction, cancelTeamInviteAction, inviteTeamMemberAction, removeTeamMemberAction } from "@/features/team/actions/manage-team";
import type { TeamPanelData } from "@/features/team/data/team-repository";

export function TeamPanel({ team }: { team: TeamPanelData }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function run(work: () => Promise<{ ok: boolean; message: string }>) {
    setMessage(""); setError("");
    startTransition(async () => { const result = await work(); if (result.ok) { setMessage(result.message); setEmail(""); router.refresh(); } else setError(result.message); });
  }

  return <section className="surface rounded-[2rem] p-6 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Shared workspace</p><h2 className="mt-2 text-xl font-semibold">Your reselling team</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Everyone uses their own login while working from the same inventory.</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--muted)]">{team.role}</span></div>
    {team.incomingInvites.map((invite) => <div key={invite.id} className="mt-5 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/8 p-4"><p className="font-semibold">Join {invite.ownerName}’s business?</p><p className="mt-1 text-xs text-[var(--muted)]">This will make their shared inventory your active workspace.</p><button disabled={pending} onClick={() => run(() => acceptTeamInviteAction(invite.id))} className="mt-3 min-h-11 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-black disabled:opacity-50">Accept invitation</button></div>)}
    <div className="mt-6 space-y-2">{team.members.map((member) => <div key={member.userId} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-black/15 px-4"><div><p className="text-sm font-semibold">{member.displayName}</p><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[var(--muted)]">{member.role}</p></div>{team.role === "owner" && member.role === "member" && <button disabled={pending} onClick={() => { if (window.confirm(`Remove ${member.displayName} from the shared workspace?`)) run(() => removeTeamMemberAction(member.userId)); }} className="min-h-10 rounded-xl px-3 text-xs font-semibold text-red-300 hover:bg-red-400/10">Remove</button>}</div>)}</div>
    {team.role === "owner" && <form onSubmit={(event) => { event.preventDefault(); run(() => inviteTeamMemberAction(email)); }} className="mt-6 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row"><label className="flex-1"><span className="sr-only">Friend’s email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="friend@example.com" className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base outline-none placeholder:text-white/25 focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-glow)]"/></label><button disabled={pending} className="min-h-12 rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-black disabled:opacity-50">{pending ? "Working…" : "Invite teammate"}</button></form>}
    {team.pendingInvites.map((invite) => <div key={invite.id} className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/8 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm">{invite.email}</p><p className="text-[10px] uppercase tracking-[.12em] text-[var(--muted)]">Waiting for signup or acceptance</p></div><button disabled={pending} onClick={() => run(() => cancelTeamInviteAction(invite.id))} className="min-h-10 shrink-0 rounded-xl px-3 text-xs font-semibold text-[var(--muted)] hover:bg-white/5 hover:text-white">Cancel</button></div>)}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}{message && <p role="status" className="mt-4 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-3 py-2 text-sm">{message}</p>}
  </section>;
}
