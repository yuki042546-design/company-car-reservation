import { notFound } from "next/navigation";
import { getActiveEmployees, getReservationById } from "@/lib/data";
import { ReservationForm } from "@/components/ReservationForm";

export const dynamic = "force-dynamic";

interface EditReservationPageProps {
  params: { id: string };
}

export default async function EditReservationPage({ params }: EditReservationPageProps) {
  const [reservation, employees] = await Promise.all([
    getReservationById(params.id),
    getActiveEmployees(),
  ]);

  if (!reservation) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-gray-900">予約の変更</h1>
      <ReservationForm employees={employees} mode="edit" reservationId={reservation.id} initial={reservation} />
    </div>
  );
}
