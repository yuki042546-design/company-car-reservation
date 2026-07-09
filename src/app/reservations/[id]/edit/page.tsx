import { notFound } from "next/navigation";
import { getActiveEmployees, getReservationById } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
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
  const dict = getDictionary(getLocale());

  if (!reservation) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-gray-900">{dict.form.editTitle}</h1>
      <ReservationForm employees={employees} mode="edit" reservationId={reservation.id} initial={reservation} />
    </div>
  );
}
