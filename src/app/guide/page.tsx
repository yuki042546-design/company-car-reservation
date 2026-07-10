import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const dynamic = "force-dynamic";

export default function GuidePage() {
  const dict = getDictionary(getLocale());

  const sections = [
    { title: dict.guide.step1Title, body: dict.guide.step1Body },
    { title: dict.guide.step2Title, body: dict.guide.step2Body },
    { title: dict.guide.step3Title, body: dict.guide.step3Body },
    { title: dict.guide.step4Title, body: dict.guide.step4Body },
    { title: dict.guide.step5Title, body: dict.guide.step5Body },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-gray-900">{dict.guide.pageTitle}</h1>
      <p className="text-sm text-gray-600">{dict.guide.intro}</p>
      <div className="space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1.5 text-base font-bold tracking-tight text-gray-900">{section.title}</h2>
            <p className="text-sm leading-relaxed text-gray-600">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
