// 通知機能の共通インターフェース。特定の外部サービス（メール/Slack/Teams/LINE WORKS）に
// 密結合させず、NotificationProvider を実装したアダプタを差し替えるだけで
// 送信先を追加・変更できるようにする。
//
// 外部サービスの認証情報が用意できていない現時点では、DevLogProvider（コンソール出力）
// のみを登録している。実運用でメール等を使う場合は providers/ 配下に
// 新しいプロバイダーを実装し、getActiveProviders() に登録すればよい。
// 詳細な追加手順は IMPLEMENTATION_STATUS.md を参照。

export type NotificationEventType =
  | "reservation_created"
  | "reservation_updated"
  | "reservation_cancelled"
  | "reminder_day_before"
  | "reminder_before_start"
  | "return_reminder"
  | "return_overdue"
  | "extend_succeeded"
  | "extend_failed"
  | "next_reservation_delayed"
  | "maintenance_affects_reservation"
  | "vehicle_document_expiring";

export interface NotificationPayload {
  eventType: NotificationEventType;
  targetUserId: string | null;
  targetType?: string | null;
  targetId?: string | null;
  /** 通知本文の組み立てに使う任意データ（予約ID、日時、車両名など）。秘密情報は入れない。 */
  data: Record<string, unknown>;
  /** 二重送信防止用キー。同じイベントに対して常に同じ値を渡すこと（例: `reservation_created:${reservationId}`）。 */
  idempotencyKey: string;
}

export type NotificationChannel = "email" | "slack" | "teams" | "line_works" | "log";

export interface NotificationProvider {
  channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<{ ok: boolean; error?: string }>;
}
