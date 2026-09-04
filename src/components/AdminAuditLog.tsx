"use client";

import { useState } from "react";
import type { AuditLog } from "@/lib/types";
import { formatDateTime } from "@/lib/dateUtils";
import { useI18n } from "./LocaleProvider";

interface AdminAuditLogProps {
  logs: AuditLog[];
}

const PAGE_SIZE = 10;

// 予約以外も含む全操作（出発・返却・延長・車両状態変更・権限変更など）の監査ログ表示。
// reservation_logs（予約の作成/変更/キャンセルのみの簡易履歴）とは別の、より網羅的な記録。
export function AdminAuditLog({ logs }: AdminAuditLogProps) {
  const { dict, locale } = useI18n();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">{dict.admin.auditLogEmpty}</p>;
  }

  const visible = logs.slice(0, visibleCount);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-3 py-2 font-medium">{dict.admin.auditLogColumnTimestamp}</th>
              <th className="px-3 py-2 font-medium">{dict.admin.auditLogColumnActor}</th>
              <th className="px-3 py-2 font-medium">{dict.admin.auditLogColumnAction}</th>
              <th className="px-3 py-2 font-medium">{dict.admin.auditLogColumnTarget}</th>
              <th className="px-3 py-2 font-medium">{dict.admin.auditLogColumnReason}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((log) => (
              <tr key={log.id} className="border-b border-gray-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-gray-700">
                  {formatDateTime(log.createdAt, locale)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">{log.actorEmail ?? "-"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">{log.action}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                  {log.targetType ? `${log.targetType}${log.targetId ? ` / ${log.targetId.slice(0, 8)}…` : ""}` : "-"}
                </td>
                <td className="px-3 py-2 text-gray-500">{log.reason ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visibleCount < logs.length && (
        <div className="text-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            {dict.admin.showMoreButton}
          </button>
        </div>
      )}
      <p className="text-right text-xs text-gray-400">
        {visibleCount < logs.length
          ? dict.admin.countLabelVisible(visible.length, logs.length)
          : dict.admin.countLabel(logs.length)}
      </p>
    </div>
  );
}
