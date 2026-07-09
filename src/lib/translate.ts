import type { Locale } from "./i18n/locales";

// ひらがな・カタカナ・CJK統合漢字。この app は日本語/ベトナム語の
// 2言語しか扱わないため、これらの文字が1つでも含まれていれば
// 日本語入力、含まれなければベトナム語入力とみなす簡易判定で十分。
const JAPANESE_CHAR_PATTERN = /[぀-ヿ㐀-鿿]/;

export function detectTextLocale(text: string): Locale {
  return JAPANESE_CHAR_PATTERN.test(text) ? "ja" : "vi";
}

const TRANSLATE_TIMEOUT_MS = 5000;

// MyMemory Translation API（https://mymemory.translated.net/）。
// 登録・APIキー不要で使える無料の翻訳APIで、1日あたりの利用量に上限は
// あるものの、この app の想定利用量（1日1〜2件の予約）であれば十分に収まる。
// 翻訳が失敗しても予約の登録・変更自体は止めない（null を返すだけ）。
async function translateText(text: string, from: Locale, to: Locale): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${from}|${to}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const json = await res.json();
    if (json?.responseStatus !== 200) return null;

    const translated = json?.responseData?.translatedText;
    return typeof translated === "string" && translated.trim() ? translated : null;
  } catch {
    // タイムアウト・ネットワークエラー・レート制限など、理由を問わず
    // 翻訳なしにフォールバックする。
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export interface TranslatedReservationFields {
  inputLocale: Locale;
  destinationTranslated: string | null;
  purposeTranslated: string | null;
}

/**
 * 行き先・用途の入力言語を判定し、もう一方の言語への翻訳を試みる。
 * 予約の作成・変更（内容が変わった場合のみ）から呼び出す。
 */
export async function translateReservationFields(
  destination: string,
  purpose: string
): Promise<TranslatedReservationFields> {
  const inputLocale = detectTextLocale(`${destination} ${purpose}`);
  const targetLocale: Locale = inputLocale === "ja" ? "vi" : "ja";

  const [destinationTranslated, purposeTranslated] = await Promise.all([
    translateText(destination, inputLocale, targetLocale),
    translateText(purpose, inputLocale, targetLocale),
  ]);

  return { inputLocale, destinationTranslated, purposeTranslated };
}
