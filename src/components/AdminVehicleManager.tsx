"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Vehicle, VehicleType } from "@/lib/types";
import { VehicleIcon, VEHICLE_TYPES } from "./VehicleIcon";
import { useI18n } from "./LocaleProvider";

interface AdminVehicleManagerProps {
  vehicles: Vehicle[];
  /** 直近30日の車両ごとの稼働率（%）。data未取得の車両は0%として扱う。 */
  utilizationRates?: Record<string, number>;
}

const MAX_VEHICLES = 4;

interface NewVehicleFields {
  name: string;
  plateNumber: string;
  model: string;
  vehicleType: VehicleType | "";
  parkingLocation: string;
  keyLocation: string;
  etcCardLocation: string;
  fuelCardLocation: string;
  emergencyContact: string;
  insuranceContact: string;
  roadsideAssistanceContact: string;
  notes: string;
  inspectionDueDate: string;
  insuranceDueDate: string;
  nextServiceDueDate: string;
  oilChangeDueDate: string;
  tireChangeDueDate: string;
}

const EMPTY_FIELDS: NewVehicleFields = {
  name: "",
  plateNumber: "",
  model: "",
  vehicleType: "",
  parkingLocation: "",
  keyLocation: "",
  etcCardLocation: "",
  fuelCardLocation: "",
  emergencyContact: "",
  insuranceContact: "",
  roadsideAssistanceContact: "",
  notes: "",
  inspectionDueDate: "",
  insuranceDueDate: "",
  nextServiceDueDate: "",
  oilChangeDueDate: "",
  tireChangeDueDate: "",
};

export function AdminVehicleManager({ vehicles, utilizationRates = {} }: AdminVehicleManagerProps) {
  const { dict } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fields, setFields] = useState<NewVehicleFields>(EMPTY_FIELDS);
  const [adding, setAdding] = useState(false);

  const statusLabel: Record<string, string> = {
    available: dict.vehicleStatus.available,
    in_use: dict.vehicleStatus.inUse,
    maintenance: dict.vehicleStatus.maintenance,
    out_of_service: dict.vehicleStatus.outOfService,
  };

  function updateField(key: keyof NewVehicleFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function toggleActive(vehicle: Vehicle) {
    setError(null);
    setBusyId(vehicle.id);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !vehicle.active }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.vehicleManager.genericError);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.vehicleManager.networkError);
    } finally {
      setBusyId(null);
    }
  }

  // 車両詳細の編集は基本的にSupabase Table Editor経由だが、車種タイプだけは
  // アイコン表示のためこの画面からも変更できるようにしておく（既存車両にも設定できるように）。
  async function updateVehicleType(vehicle: Vehicle, vehicleType: VehicleType | "") {
    setError(null);
    setBusyId(vehicle.id);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.vehicleManager.genericError);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.vehicleManager.networkError);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fields.name.trim()) {
      setError(dict.apiErrors.vehicleNameRequired);
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          name: fields.name.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.apiErrors.addVehicleFailed);
        return;
      }
      setFields(EMPTY_FIELDS);
      router.refresh();
    } catch {
      setError(dict.vehicleManager.networkError);
    } finally {
      setAdding(false);
    }
  }

  const atLimit = vehicles.length >= MAX_VEHICLES;

  const textFields: { key: keyof NewVehicleFields; label: string }[] = [
    { key: "plateNumber", label: dict.vehicleInfo.plateNumberLabel },
    { key: "model", label: dict.vehicleInfo.modelLabel },
    { key: "parkingLocation", label: dict.vehicleInfo.parkingLocationLabel },
    { key: "keyLocation", label: dict.vehicleInfo.keyLocationLabel },
    { key: "etcCardLocation", label: dict.vehicleInfo.etcCardLocationLabel },
    { key: "fuelCardLocation", label: dict.vehicleInfo.fuelCardLocationLabel },
    { key: "emergencyContact", label: dict.vehicleInfo.emergencyContactLabel },
    { key: "insuranceContact", label: dict.vehicleInfo.insuranceContactLabel },
    { key: "roadsideAssistanceContact", label: dict.vehicleInfo.roadsideAssistanceContactLabel },
    { key: "notes", label: dict.vehicleInfo.notesLabel },
  ];
  const dateFields: { key: keyof NewVehicleFields; label: string }[] = [
    { key: "inspectionDueDate", label: dict.vehicleInfo.inspectionDueDateLabel },
    { key: "insuranceDueDate", label: dict.vehicleInfo.insuranceDueDateLabel },
    { key: "nextServiceDueDate", label: dict.vehicleInfo.nextServiceDueDateLabel },
    { key: "oilChangeDueDate", label: dict.vehicleInfo.oilChangeDueDateLabel },
    { key: "tireChangeDueDate", label: dict.vehicleInfo.tireChangeDueDateLabel },
  ];

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg border border-danger-border bg-danger-soft p-2 text-sm text-danger">{error}</p>}

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {vehicles.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">{dict.vehicleInfo.empty}</li>}
        {vehicles.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <VehicleIcon type={v.vehicleType} className="w-20" />
              <div className="min-w-0">
                <div className={v.active ? "text-gray-800" : "text-gray-400 line-through"}>{v.name}</div>
                <div className="mt-0.5 text-xs text-gray-400">{statusLabel[v.status] ?? v.status}</div>
                <div className="mt-0.5 text-xs text-gray-400">
                  {dict.vehicleManager.utilizationLabel(utilizationRates[v.id] ?? 0)}
                </div>
                <select
                  value={v.vehicleType ?? ""}
                  onChange={(e) => updateVehicleType(v, e.target.value as VehicleType | "")}
                  disabled={busyId === v.id}
                  className="mt-1 rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 disabled:opacity-50"
                >
                  <option value="">{dict.vehicleInfo.vehicleTypeUnset}</option>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {dict.vehicleInfo.vehicleTypeLabels[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => toggleActive(v)}
              disabled={busyId === v.id}
              className={
                v.active
                  ? "shrink-0 rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  : "shrink-0 rounded-lg border border-brand-100 bg-brand-50 px-3 py-1 text-xs text-brand-600 hover:bg-brand-100 disabled:opacity-50"
              }
            >
              {v.active ? dict.vehicleManager.deactivate : dict.vehicleManager.activate}
            </button>
          </li>
        ))}
      </ul>

      {atLimit ? (
        <p className="text-xs text-gray-400">{dict.vehicleManager.limitReachedNote}</p>
      ) : (
        <form onSubmit={handleAdd} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold text-gray-500">{dict.vehicleManager.addSectionTitle}</p>
          <input
            type="text"
            value={fields.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder={dict.vehicleInfo.nameLabel}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
          />
          <select
            value={fields.vehicleType}
            onChange={(e) => updateField("vehicleType", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700"
          >
            <option value="">{dict.vehicleInfo.vehicleTypeLabel}</option>
            {VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {dict.vehicleInfo.vehicleTypeLabels[t]}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {textFields.map((f) => (
              <input
                key={f.key}
                type="text"
                value={fields[f.key]}
                onChange={(e) => updateField(f.key, e.target.value)}
                placeholder={f.label}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {dateFields.map((f) => (
              <label key={f.key} className="block text-xs text-gray-500">
                {f.label}
                <input
                  type="date"
                  value={fields[f.key]}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900"
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {adding ? dict.common.adding : dict.common.add}
          </button>
        </form>
      )}
    </div>
  );
}
