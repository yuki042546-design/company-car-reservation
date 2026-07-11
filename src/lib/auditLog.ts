import type { SupabaseClient } from "@supabase/supabase-js";

export interface WriteAuditLogParams {
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string | null;
}

/**
 * 監査ログ（audit_logs）への書き込み。予約・車両・ユーザー権限・設定変更など、
 * 「誰が・いつ・何を・なぜ変更したか」を残す必要がある操作すべてで呼び出す。
 * 一般社員は閲覧・変更・削除できず、書き込みはこの関数（service role経由）のみ。
 * 監査ログの書き込み失敗で本来の操作自体を失敗させることはしない
 * （呼び出し側で try/catch し、エラーはログに残す運用を推奨）。
 */
export async function writeAuditLog(supabase: SupabaseClient, params: WriteAuditLogParams): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      actor_user_id: params.actorUserId,
      actor_email: params.actorEmail,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      before_data: params.beforeData ?? null,
      after_data: params.afterData ?? null,
      reason: params.reason ?? null,
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}
