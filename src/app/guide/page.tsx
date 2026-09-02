import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export const dynamic = "force-dynamic";

export default function GuidePage() {
  const dict = getDictionary(getLocale());

  // 出発・返却時の走行距離入力は特に守ってほしいルールのため、
  // 他のステップと区別して目立たせる（amber = 注意喚起色）。
  const sections = [
    { title: dict.guide.step1Title, body: dict.guide.step1Body, highlight: false },
    { title: dict.guide.step2Title, body: dict.guide.step2Body, highlight: false },
    { title: dict.guide.step3Title, body: dict.guide.step3Body, highlight: true },
    { title: dict.guide.step4Title, body: dict.guide.step4Body, highlight: true },
    { title: dict.guide.step5Title, body: dict.guide.step5Body, highlight: false },
    { title: dict.guide.step6Title, body: dict.guide.step6Body, highlight: false },
    { title: dict.guide.step7Title, body: dict.guide.step7Body, highlight: false },
    { title: dict.guide.step8Title, body: dict.guide.step8Body, highlight: false },
    { title: dict.guide.step9Title, body: dict.guide.step9Body, highlight: false },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-gray-900">{dict.guide.pageTitle}</h1>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
        {dict.guide.intro}
      </p>
      <div className="space-y-4">
        {sections.map((section) => (
          <section
            key={section.title}
            className={
              section.highlight
                ? "rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm"
                : "rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            }
          >
            <h2
              className={
                section.highlight
                  ? "mb-1.5 text-base font-bold tracking-tight text-amber-900"
                  : "mb-1.5 text-base font-bold tracking-tight text-gray-900"
              }
            >
              {section.title}
            </h2>
            <p className={section.highlight ? "text-sm leading-relaxed text-amber-800" : "text-sm leading-relaxed text-gray-600"}>
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
