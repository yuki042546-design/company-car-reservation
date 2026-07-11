import type { NotificationProvider } from "./types";
import { devLogProvider } from "./providers/devLogProvider";
import { slackProvider } from "./providers/slackProvider";
import { teamsProvider } from "./providers/teamsProvider";

/**
 * 有効な通知プロバイダーの一覧。環境変数が設定されているものだけを有効化する。
 * 社内ではMicrosoft Teamsを利用しているため teamsProvider がメインの想定。
 * 新しいプロバイダー（メール・LINE WORKSなど）を追加する場合は
 * src/lib/notifications/providers/ に実装を追加し、ここに条件付きで登録するだけでよい。
 */
export function getActiveProviders(): NotificationProvider[] {
  const providers: NotificationProvider[] = [devLogProvider];
  if (process.env.TEAMS_WEBHOOK_URL) {
    providers.push(teamsProvider);
  }
  if (process.env.SLACK_WEBHOOK_URL) {
    providers.push(slackProvider);
  }
  return providers;
}
