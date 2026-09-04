import {
  getCurrentUsageReservation,
  getNextReservation,
  getOpenUsageRecordDepartureOdometer,
} from "@/lib/data";
import { getActiveVehicles } from "@/lib/vehicles";
import { VehicleStatusBanner } from "@/components/VehicleStatusBanner";

// トップ画面で一番見せたい「今すぐ使えるか・出発/返却操作」を、他のセクション
// （カレンダー・今日/今週の一覧）を待たずに表示できるよう、独立した非同期
// コンポーネントに分離している（親の page.tsx 側で Suspense を被せてストリーミングする）。
export async function VehicleBannersSection() {
  const now = new Date();
  const vehicles = await getActiveVehicles();

  const vehicleBanners = await Promise.all(
    vehicles.map(async (vehicle) => {
      const [currentUsage, nextReservation] = await Promise.all([
        getCurrentUsageReservation(vehicle.id),
        getNextReservation(vehicle.id, now),
      ]);
      const departureOdometer = currentUsage ? await getOpenUsageRecordDepartureOdometer(currentUsage.id) : null;
      return { vehicle, currentUsage, nextReservation, departureOdometer };
    })
  );

  return (
    <div className="space-y-3">
      {vehicleBanners.map(({ vehicle, currentUsage, nextReservation, departureOdometer }) => (
        <VehicleStatusBanner
          key={vehicle.id}
          vehicle={vehicle}
          currentUsage={currentUsage}
          nextReservation={nextReservation}
          departureOdometer={departureOdometer}
        />
      ))}
    </div>
  );
}
