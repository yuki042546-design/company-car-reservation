import { describe, expect, it } from "vitest";
import ja from "./i18n/dictionaries/ja";
import { isOverlapping, validateReservationInput, type ReservationRuleLimits } from "./reservationRules";
import type { ReservationInput } from "./types";

// このアプリはクライアント側で datetime-local の値を toISOString() で変換してから
// サーバーへ送るため（datetimeLocalToIso）、startTime/endTime は常にオフセット付きの
// ISO文字列として届く。テストでもその契約に合わせ、常に +09:00（JST）を明示する
// （オフセットなしの文字列はテスト実行環境のローカルタイムゾーンに依存してしまうため避ける）。
const LIMITS: ReservationRuleLimits = {
  minDurationMinutes: 30,
  maxDurationMinutes: 240,
  bookingHorizonDays: 90,
};

const NOW = new Date("2026-07-10T00:00:00+09:00");

function makeInput(overrides: Partial<ReservationInput> = {}): ReservationInput {
  return {
    employeeName: "山田太郎",
    startTime: "2026-07-11T10:00:00+09:00",
    endTime: "2026-07-11T11:00:00+09:00",
    destination: "取引先訪問",
    purpose: "打ち合わせ",
    ...overrides,
  };
}

describe("validateReservationInput", () => {
  it("accepts a valid 1-hour reservation on the slot boundary", () => {
    const result = validateReservationInput(makeInput(), ja, NOW, LIMITS);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects when required fields are missing", () => {
    const result = validateReservationInput(makeInput({ employeeName: "", destination: "" }), ja, NOW, LIMITS);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(ja.validation.employeeNameRequired);
    expect(result.errors).toContain(ja.validation.destinationRequired);
  });

  it("rejects start times not on a 30-minute slot boundary", () => {
    const result = validateReservationInput(
      makeInput({ startTime: "2026-07-11T10:15:00+09:00", endTime: "2026-07-11T11:15:00+09:00" }),
      ja,
      NOW,
      LIMITS
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(ja.validation.startNotOnSlot);
  });

  it("rejects reservations in the past", () => {
    const result = validateReservationInput(
      makeInput({ startTime: "2026-07-09T10:00:00+09:00", endTime: "2026-07-09T11:00:00+09:00" }),
      ja,
      NOW,
      LIMITS
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(ja.validation.pastDateTime);
  });

  it("rejects end time before or equal to start time", () => {
    const result = validateReservationInput(
      makeInput({ startTime: "2026-07-11T11:00:00+09:00", endTime: "2026-07-11T10:00:00+09:00" }),
      ja,
      NOW,
      LIMITS
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(ja.validation.endBeforeStart);
  });

  it("rejects durations shorter than the minimum", () => {
    const result = validateReservationInput(
      makeInput({ startTime: "2026-07-11T10:00:00+09:00", endTime: "2026-07-11T10:00:00+09:00" }),
      ja,
      NOW,
      LIMITS
    );
    expect(result.valid).toBe(false);
  });

  it("rejects durations longer than the configured maximum", () => {
    const result = validateReservationInput(
      makeInput({ startTime: "2026-07-11T09:00:00+09:00", endTime: "2026-07-11T14:00:00+09:00" }),
      ja,
      NOW,
      LIMITS
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(ja.validation.tooLong);
  });

  it("allows a longer duration when the manager limit is passed in", () => {
    const managerLimits: ReservationRuleLimits = { ...LIMITS, maxDurationMinutes: 480 };
    const result = validateReservationInput(
      makeInput({ startTime: "2026-07-11T09:00:00+09:00", endTime: "2026-07-11T14:00:00+09:00" }),
      ja,
      NOW,
      managerLimits
    );
    expect(result.valid).toBe(true);
  });

  it("rejects reservations beyond the booking horizon", () => {
    const result = validateReservationInput(
      makeInput({ startTime: "2027-01-01T10:00:00+09:00", endTime: "2027-01-01T11:00:00+09:00" }),
      ja,
      NOW,
      LIMITS
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(ja.validation.beyondBookingHorizon(LIMITS.bookingHorizonDays));
  });

  it("rejects destination strings that are too long", () => {
    const result = validateReservationInput(makeInput({ destination: "a".repeat(201) }), ja, NOW, LIMITS);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(ja.validation.destinationTooLong);
  });
});

describe("isOverlapping", () => {
  it("treats adjacent reservations (11:00 end / 11:00 start) as non-overlapping", () => {
    const existingStart = new Date("2026-07-11T10:00:00+09:00");
    const existingEnd = new Date("2026-07-11T11:00:00+09:00");
    const newStart = new Date("2026-07-11T11:00:00+09:00");
    const newEnd = new Date("2026-07-11T12:00:00+09:00");
    expect(isOverlapping(newStart, newEnd, existingStart, existingEnd)).toBe(false);
  });

  it("treats overlapping ranges (10:30-11:30 vs 10:00-11:00) as overlapping", () => {
    const existingStart = new Date("2026-07-11T10:00:00+09:00");
    const existingEnd = new Date("2026-07-11T11:00:00+09:00");
    const newStart = new Date("2026-07-11T10:30:00+09:00");
    const newEnd = new Date("2026-07-11T11:30:00+09:00");
    expect(isOverlapping(newStart, newEnd, existingStart, existingEnd)).toBe(true);
  });
});
