import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/home");
  }
  const dict = getDictionary(getLocale());

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold tracking-tight text-gray-900">{dict.login.pageTitle}</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
