import { getActiveEmployees } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { ReservationForm } from "@/components/ReservationForm";

export const dynamic = "force-dynamic";

interface NewReservationPageProps {
  searchParams: { date?: string };
}

export default async function NewReservationPage({ searchParams }: NewReservationPageProps) {
  const employees = await getActiveEmployees();
  const dict = getDictionary(getLocale());

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-gray-900">{dict.form.newTitle}</h1>
      <ReservationForm employees={employees} mode="create" initialDate={searchParams.date} />
    </div>
  );
}
