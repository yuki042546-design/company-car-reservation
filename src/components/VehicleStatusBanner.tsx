"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Reservation, Vehicle } from "@/lib/types";
import { formatDateTime } from "@/lib/dateUtils";
import { displayDestination } from "@/lib/displayText";
import { useI18n } from "./LocaleProvider";

interface VehicleStatusBannerProps {
  vehicle: Vehicle;
  currentUsage: Reservation | null;
  nextReservation: Reservation | null;
  /** 使用中の場合、出発時に記録済みの走行距離（返却値との比較・参考表示に使う）。 */
  departureOdometer?: number | null;
}

const STATUS_STYLES: Record<string, string> = {
  available: "bg-brand-50 text-brand-700 border-brand-100",
  in_use: "bg-amber-50 text-amber-700 border-amber-100",
  maintenance: "bg-gray-100 text-gray-700 border-gray-200",
  out_of_service: "bg-danger-soft text-danger border-danger-border",
};

export function VehicleStatusBanner({
  vehicle,
  currentUsage,
  nextReservation,
  departureOdometer: recordedDepartureOdometer,
}: VehicleStatusBannerProps) {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departureOdometer, setDepartureOdometer] = useState("");
  const [returnOdometer, setReturnOdometer] = useState("");

  const trackMileage = vehicle.trackMileage;

  const parsedDepartureInput = Number(departureOdometer);
  const isDepartureInputValid = !trackMileage
    ? true
    : departureOdometer.trim() !== "" && Number.isFinite(parsedDepartureInput) && parsedDepartureInput >= 0;

  const parsedReturnInput = Number(returnOdometer);
  const isReturnBelowDeparture =
    trackMileage &&
    recordedDepartureOdometer != null &&
    returnOdometer.trim() !== "" &&
    Number.isFinite(parsedReturnInput) &&
    parsedReturnInput < recordedDepartureOdometer;
  const isReturnInputValid = !trackMileage
    ? true
    : returnOdometer.trim() !== "" &&
      Number.isFinite(parsedReturnInput) &&
      parsedReturnInput >= 0 &&
      !isReturnBelowDeparture;

  const statusLabel =
    vehicle.status === "available"
      ? dict.vehicleStatus.available
      : vehicle.status === "in_use"
        ? currentUsage?.status === "overdue"
          ? dict.vehicleStatus.overdue
          : dict.vehicleStatus.inUse
        : vehicle.status === "maintenance"
          ? dict.vehicleStatus.maintenance
          : dict.vehicleStatus.outOfService;

  const canOperate = !!currentUsage;

  async function callAction(action: string, payload: Record<string, unknown> = {}) {
    if (!currentUsage) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/reservations/${currentUsage.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.action.genericError);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.action.networkError);
    } finally {
      setBusy(false);
    }
  }

  async function handleReturn() {
    if (!isReturnInputValid) return;
    await callAction("return", trackMileage ? { returnOdometer: parsedReturnInput } : {});
  }

  async function handleExtend() {
    if (!currentUsage) return;
    const newEnd = new Date(new Date(currentUsage.endTime).getTime() + 60 * 60 * 1000);
    await callAction("extend", { newEndTime: newEnd.toISOString() });
  }

  async function handleDepart() {
    if (!nextReservation || !isDepartureInputValid) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/reservations/${nextReservation.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "depart",
          ...(trackMileage ? { departureOdometer: parsedDepartureInput } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.action.genericError);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.action.networkError);
    } finally {
      setBusy(false);
    }
  }

  const canDepartNext = !!nextReservation;

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${STATUS_STYLES[vehicle.status] ?? "bg-white"}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{vehicle.name}</h2>
        <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-bold">{statusLabel}</span>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {vehicle.status === "in_use" && currentUsage ? (
        <div className="mt-3 space-y-1 text-sm">
          <p>
            <span className="text-gray-500">{dict.vehicleStatus.currentUserLabel}: </span>
            {currentUsage.employeeName}
          </p>
          <p>
            <span className="text-gray-500">{dict.vehicleStatus.expectedReturnLabel}: </span>
            {formatDateTime(currentUsage.endTime, locale)}
          </p>
          <p>
            <span className="text-gray-500">{dict.vehicleStatus.destinationLabel}: </span>
            {displayDestination(currentUsage, locale)}
          </p>
          {canOperate && (
            <div className="mt-3 space-y-2">
              {trackMileage && recordedDepartureOdometer != null && (
                <p className="text-xs text-gray-500">
                  {dict.action.departureOdometerReferenceLabel(recordedDepartureOdometer)}
                </p>
              )}
              {trackMileage && (
                <label className="flex items-center gap-2 text-xs text-gray-500">
                  {dict.action.returnOdometerLabel}
                  <span className="text-red-500">*</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={10}
                    required
                    value={returnOdometer}
                    onChange={(e) => setReturnOdometer(e.target.value)}
                    className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                  />
                </label>
              )}
              {isReturnBelowDeparture && (
                <p className="text-xs text-danger">{dict.validation.returnOdometerTooLow}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleReturn}
                  disabled={busy || !isReturnInputValid}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {dict.action.returnButton}
                </button>
                <button
                  onClick={handleExtend}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {dict.action.extendButton}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : vehicle.status === "available" ? (
        <div className="mt-3 space-y-2 text-sm">
          {nextReservation ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                <span className="text-gray-500">{dict.vehicleStatus.nextReservationLabel}: </span>
                {formatDateTime(nextReservation.startTime, locale)} ・ {nextReservation.employeeName}
              </p>
              {canDepartNext && (
                <div className="flex items-center gap-2">
                  {trackMileage && (
                    <label className="flex items-center gap-2 text-xs text-gray-500">
                      {dict.action.departureOdometerLabel}
                      <span className="text-red-500">*</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={10}
                        required
                        value={departureOdometer}
                        onChange={(e) => setDepartureOdometer(e.target.value)}
                        className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                      />
                    </label>
                  )}
                  <button
                    onClick={handleDepart}
                    disabled={busy || !isDepartureInputValid}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {dict.action.departButton}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">{dict.vehicleStatus.nextReservationNone}</p>
          )}
          {vehicle.keyLocation && (
            <p>
              <span className="text-gray-500">{dict.vehicleStatus.keyLocationLabel}: </span>
              {vehicle.keyLocation}
            </p>
          )}
          {vehicle.parkingLocation && (
            <p>
              <span className="text-gray-500">{dict.vehicleStatus.parkingLocationLabel}: </span>
              {vehicle.parkingLocation}
            </p>
          )}
          <Link
            href="/reservations/new"
            className="mt-2 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            {dict.vehicleStatus.newReservationButton}
          </Link>
        </div>
      ) : (
        vehicle.notes && <p className="mt-2 text-sm text-gray-600">{vehicle.notes}</p>
      )}
    </div>
  );
}
