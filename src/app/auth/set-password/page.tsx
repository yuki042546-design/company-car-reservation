import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { SetPasswordForm } from "@/components/SetPasswordForm";

export const dynamic = "force-dynamic";

export default function SetPasswordPage() {
  const dict = getDictionary(getLocale());

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-gray-900">{dict.setPassword.pageTitle}</h1>
      <SetPasswordForm />
    </div>
  );
}
