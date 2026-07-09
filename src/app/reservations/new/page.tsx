import { getActiveEmployees } from "@/lib/data";
import { ReservationForm } from "@/components/ReservationForm";

export const dynamic = "force-dynamic";

export default async function NewReservationPage() {
  const employees = await getActiveEmployees();

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-gray-900">新規予約</h1>
      <ReservationForm employees={employees} mode="create" />
    </div>
  );
}
