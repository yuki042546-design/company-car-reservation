import { describe, expect, it } from "vitest";
import { canTransitionReservation, canTransitionVehicle, isReservationEditableByOwner } from "./reservationStatus";

describe("canTransitionReservation", () => {
  it("allows reserved -> in_use", () => {
    expect(canTransitionReservation("reserved", "in_use")).toBe(true);
  });
  it("allows reserved -> cancelled", () => {
    expect(canTransitionReservation("reserved", "cancelled")).toBe(true);
  });
  it("allows reserved -> no_show", () => {
    expect(canTransitionReservation("reserved", "no_show")).toBe(true);
  });
  it("allows in_use -> completed", () => {
    expect(canTransitionReservation("in_use", "completed")).toBe(true);
  });
  it("allows in_use -> overdue", () => {
    expect(canTransitionReservation("in_use", "overdue")).toBe(true);
  });
  it("allows overdue -> completed", () => {
    expect(canTransitionReservation("overdue", "completed")).toBe(true);
  });
  it("rejects reserved -> completed directly (must go through in_use)", () => {
    expect(canTransitionReservation("reserved", "completed")).toBe(false);
  });
  it("rejects completed -> reserved (no reviving a finished reservation)", () => {
    expect(canTransitionReservation("completed", "reserved")).toBe(false);
  });
  it("rejects cancelled -> anything (terminal state)", () => {
    expect(canTransitionReservation("cancelled", "reserved")).toBe(false);
    expect(canTransitionReservation("cancelled", "in_use")).toBe(false);
  });
  it("rejects in_use -> cancelled (cancellation only applies before departure)", () => {
    expect(canTransitionReservation("in_use", "cancelled")).toBe(false);
  });
});

describe("canTransitionVehicle", () => {
  it("allows available -> in_use", () => {
    expect(canTransitionVehicle("available", "in_use")).toBe(true);
  });
  it("allows available -> maintenance", () => {
    expect(canTransitionVehicle("available", "maintenance")).toBe(true);
  });
  it("allows maintenance -> available", () => {
    expect(canTransitionVehicle("maintenance", "available")).toBe(true);
  });
  it("allows out_of_service -> available", () => {
    expect(canTransitionVehicle("out_of_service", "available")).toBe(true);
  });
});

describe("isReservationEditableByOwner", () => {
  it("is true only for reserved", () => {
    expect(isReservationEditableByOwner("reserved")).toBe(true);
    expect(isReservationEditableByOwner("in_use")).toBe(false);
    expect(isReservationEditableByOwner("completed")).toBe(false);
    expect(isReservationEditableByOwner("cancelled")).toBe(false);
  });
});
