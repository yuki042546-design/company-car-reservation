import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { formatDate } from "@/lib/dateUtils";
import { getAllVehicles } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const locale = getLocale();
  const dict = getDictionary(locale);
  const vehicles = await getAllVehicles();

  const statusLabel: Record<string, string> = {
    available: dict.vehicleStatus.available,
    in_use: dict.vehicleStatus.inUse,
    maintenance: dict.vehicleStatus.maintenance,
    out_of_service: dict.vehicleStatus.outOfService,
  };

  function fieldsFor(v: (typeof vehicles)[number]): { label: string; value: string | null }[] {
    return [
      { label: dict.vehicleInfo.plateNumberLabel, value: v.plateNumber },
      { label: dict.vehicleInfo.modelLabel, value: v.model },
      { label: dict.vehicleInfo.parkingLocationLabel, value: v.parkingLocation },
      { label: dict.vehicleInfo.keyLocationLabel, value: v.keyLocation },
      { label: dict.vehicleInfo.etcCardLocationLabel, value: v.etcCardLocation },
      { label: dict.vehicleInfo.fuelCardLocationLabel, value: v.fuelCardLocation },
      { label: dict.vehicleInfo.emergencyContactLabel, value: v.emergencyContact },
      { label: dict.vehicleInfo.insuranceContactLabel, value: v.insuranceContact },
      { label: dict.vehicleInfo.roadsideAssistanceContactLabel, value: v.roadsideAssistanceContact },
      {
        label: dict.vehicleInfo.inspectionDueDateLabel,
        value: v.inspectionDueDate ? formatDate(v.inspectionDueDate, locale) : null,
      },
      {
        label: dict.vehicleInfo.insuranceDueDateLabel,
        value: v.insuranceDueDate ? formatDate(v.insuranceDueDate, locale) : null,
      },
      {
        label: dict.vehicleInfo.nextServiceDueDateLabel,
        value: v.nextServiceDueDate ? formatDate(v.nextServiceDueDate, locale) : null,
      },
      {
        label: dict.vehicleInfo.oilChangeDueDateLabel,
        value: v.oilChangeDueDate ? formatDate(v.oilChangeDueDate, locale) : null,
      },
      {
        label: dict.vehicleInfo.tireChangeDueDateLabel,
        value: v.tireChangeDueDate ? formatDate(v.tireChangeDueDate, locale) : null,
      },
      { label: dict.vehicleInfo.notesLabel, value: v.notes },
    ];
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-gray-900">{dict.vehicleInfo.pageTitle}</h1>

      {vehicles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-sm text-gray-400">
          {dict.vehicleInfo.empty}
        </p>
      ) : (
        vehicles.map((vehicle) => (
          <section key={vehicle.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold tracking-tight text-gray-900">{vehicle.name}</h2>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                {statusLabel[vehicle.status] ?? vehicle.status}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {fieldsFor(vehicle).map((field) => (
                <div key={field.label} className="flex justify-between gap-2 border-b border-gray-100 py-1 sm:justify-start">
                  <dt className="shrink-0 text-gray-500">{field.label}</dt>
                  <dd className="text-right text-gray-800 sm:ml-auto">{field.value || dict.vehicleInfo.notSet}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))
      )}
    </div>
  );
}
