import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const dynamic = "force-dynamic";

export default function GuidePage() {
  const dict = getDictionary(getLocale());

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-gray-900">{dict.guide.pageTitle}</h1>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
        {dict.guide.intro}
      </p>
      <div className="space-y-8">
        {dict.guide.categories.map((category) => (
          <div key={category.title}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">{category.title}</h2>
            <div className="space-y-4">
              {category.steps.map((step) => (
                <section
                  key={step.title}
                  className={
                    step.highlight
                      ? "rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm"
                      : "rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  }
                >
                  <h3
                    className={
                      step.highlight
                        ? "mb-1.5 text-base font-bold tracking-tight text-amber-900"
                        : "mb-1.5 text-base font-bold tracking-tight text-gray-900"
                    }
                  >
                    {step.title}
                  </h3>
                  <p className={step.highlight ? "text-sm leading-relaxed text-amber-800" : "text-sm leading-relaxed text-gray-600"}>
                    {step.body}
                  </p>
                </section>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
