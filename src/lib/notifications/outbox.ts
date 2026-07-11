import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveProviders } from "./registry";
import type { NotificationPayload } from "./types";

/**
 * 通知イベントをoutbox（notifications / notification_deliveries）へ書き込む。
 * 実際の送信はここでは行わず、processPendingDeliveries()（Cron等から定期実行）が担当する。
 * idempotencyKey が重複する場合は新規作成せず、既存の通知をそのまま返す
 * （同じイベントに対する重複送信を防ぐ）。
 */
export async function enqueueNotification(
  supabase: SupabaseClient,
  payload: NotificationPayload
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("idempotency_key", payload.idempotencyKey)
      .maybeSingle();
    if (existing) return;

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        event_type: payload.eventType,
        target_user_id: payload.targetUserId,
        target_type: payload.targetType ?? null,
        target_id: payload.targetId ?? null,
        payload: payload.data,
        idempotency_key: payload.idempotencyKey,
      })
      .select("id")
      .single();

    if (error || !notification) return;

    const providers = getActiveProviders();
    if (providers.length === 0) return;

    await supabase.from("notification_deliveries").insert(
      providers.map((p) => ({
        notification_id: notification.id,
        channel: p.channel,
        status: "pending",
      }))
    );
  } catch (err) {
    console.error("Failed to enqueue notification", err);
  }
}

/**
 * 未送信の通知配信を処理する（Vercel Cron等から定期実行する想定）。
 * 1配信ごとに対応するプロバイダーのsend()を呼び、結果に応じてstatus/attempts/last_errorを更新する。
 */
export async function processPendingDeliveries(supabase: SupabaseClient, limit = 50): Promise<void> {
  const providers = getActiveProviders();
  const providerByChannel = new Map(providers.map((p) => [p.channel, p]));

  const { data: deliveries, error } = await supabase
    .from("notification_deliveries")
    .select("*, notifications(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !deliveries) return;

  for (const delivery of deliveries) {
    const provider = providerByChannel.get(delivery.channel);
    const notification = delivery.notifications;
    if (!provider || !notification) {
      await supabase
        .from("notification_deliveries")
        .update({ status: "failed", last_error: "no provider or notification", attempts: delivery.attempts + 1 })
        .eq("id", delivery.id);
      continue;
    }

    const result = await provider.send({
      eventType: notification.event_type,
      targetUserId: notification.target_user_id,
      targetType: notification.target_type,
      targetId: notification.target_id,
      data: notification.payload ?? {},
      idempotencyKey: notification.idempotency_key,
    });

    await supabase
      .from("notification_deliveries")
      .update({
        status: result.ok ? "sent" : "failed",
        attempts: delivery.attempts + 1,
        last_error: result.error ?? null,
        sent_at: result.ok ? new Date().toISOString() : null,
      })
      .eq("id", delivery.id);
  }
}
