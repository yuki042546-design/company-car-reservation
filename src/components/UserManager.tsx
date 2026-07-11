"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppUser, Role } from "@/lib/types";
import { useI18n } from "./LocaleProvider";

interface UserManagerProps {
  users: AppUser[];
}

const ROLES: Role[] = ["employee", "vehicle_manager", "system_admin"];

export function UserManager({ users }: UserManagerProps) {
  const { dict } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("employee");
  const [inviteDepartment, setInviteDepartment] = useState("");
  const [inviting, setInviting] = useState(false);

  function roleLabel(role: Role): string {
    return dict.userManager.roleLabels[role];
  }

  async function patchUser(id: string, body: Record<string, unknown>) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.userManager.genericError);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.userManager.networkError);
    } finally {
      setBusyId(null);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!inviteEmail.trim()) {
      setError(dict.userManager.emailRequired);
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          department: inviteDepartment.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.userManager.inviteError);
        return;
      }
      setNotice(dict.userManager.inviteSuccess(inviteEmail.trim()));
      setInviteEmail("");
      setInviteDepartment("");
      setInviteRole("employee");
      router.refresh();
    } catch {
      setError(dict.userManager.networkError);
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-danger-border bg-danger-soft p-2 text-sm text-danger">{error}</p>
      )}
      {notice && (
        <p className="rounded-lg border border-brand-100 bg-brand-50 p-2 text-sm text-brand-700">{notice}</p>
      )}

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {users.map((u) => (
          <li key={u.id} className="space-y-2 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className={u.active ? "text-gray-800" : "text-gray-400 line-through"}>{u.displayName}</div>
                <div className="mt-0.5 truncate text-xs text-gray-400">
                  {u.email}
                  {u.department ? ` ・ ${u.department}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <select
                  value={u.role}
                  onChange={(e) => patchUser(u.id, { role: e.target.value })}
                  disabled={busyId === u.id}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => patchUser(u.id, { driverEligible: !u.driverEligible })}
                  disabled={busyId === u.id}
                  className={
                    u.driverEligible
                      ? "rounded-lg border border-brand-100 bg-brand-50 px-3 py-1 text-xs text-brand-600 hover:bg-brand-100 disabled:opacity-50"
                      : "rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  }
                >
                  {u.driverEligible ? dict.userManager.driverEligible : dict.userManager.driverNotEligible}
                </button>
                <button
                  onClick={() => patchUser(u.id, { active: !u.active })}
                  disabled={busyId === u.id}
                  className={
                    u.active
                      ? "rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      : "rounded-lg border border-brand-100 bg-brand-50 px-3 py-1 text-xs text-brand-600 hover:bg-brand-100 disabled:opacity-50"
                  }
                >
                  {u.active ? dict.userManager.deactivate : dict.userManager.activate}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleInvite} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-xs font-semibold text-gray-500">{dict.userManager.inviteSectionTitle}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={dict.userManager.emailPlaceholder}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm sm:col-span-2"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={inviteDepartment}
            onChange={(e) => setInviteDepartment(e.target.value)}
            placeholder={dict.userManager.departmentPlaceholder}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm sm:col-span-2"
          />
        </div>
        <button
          type="submit"
          disabled={inviting}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {inviting ? dict.userManager.inviting : dict.userManager.inviteButton}
        </button>
      </form>
      <p className="text-xs text-gray-400">{dict.userManager.footnote}</p>
    </div>
  );
}
