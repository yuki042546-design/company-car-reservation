import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-gray-900">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <circle cx="8" cy="14" r="3.2" />
              <path d="M10.8 11.8 19 3.6" />
              <path d="M15.5 8.1 18 5.6M17.7 5.4l2 2" />
            </svg>
          </span>
          社用車予約
        </Link>
        <nav className="flex gap-5 text-[13px] font-semibold">
          <Link href="/reservations" className="text-gray-500 hover:text-brand-600">
            予約一覧
          </Link>
          <Link href="/admin" className="text-gray-500 hover:text-brand-600">
            管理者
          </Link>
        </nav>
      </div>
    </header>
  );
}
