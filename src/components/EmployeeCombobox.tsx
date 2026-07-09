"use client";

import { useEffect, useRef, useState } from "react";
import type { Employee } from "@/lib/types";

interface EmployeeComboboxProps {
  id: string;
  employees: Employee[];
  value: string;
  onChange: (name: string) => void;
  required?: boolean;
}

// 社員名のプルダウン兼検索ボックス。
// - タップ／クリックして開いた直後は「絞り込みなしの全員」を一覧表示する
//   （＝プルダウン選択として使える）。
// - そこから文字を入力すると、その時点で一覧が検索絞り込みに切り替わる
//   （＝検索ボックスとして使える）。
// 最終的に選べる値は employees リストにある名前のみに制限する
// （自由入力のまま確定させない＝「プルダウン選択」という要件を維持する）。
export function EmployeeCombobox({ id, employees, value, onChange, required }: EmployeeComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 親から value が変わったら（編集画面の初期化など）表示テキストも同期する
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const options = filtering
    ? employees.filter((emp) => emp.name.toLowerCase().includes(query.trim().toLowerCase()))
    : employees;

  function openFullList() {
    setFiltering(false);
    setOpen(true);
    const currentIndex = employees.findIndex((emp) => emp.name === value);
    setHighlighted(currentIndex >= 0 ? currentIndex : 0);
  }

  function selectEmployee(name: string) {
    setQuery(name);
    onChange(name);
    setOpen(false);
    setFiltering(false);
  }

  function handleFocus() {
    openFullList();
    // 既存の入力内容を選択状態にしておくと、そのままタイプするだけで
    // 検索絞り込みに移行できる（クリックだけなら一覧から選べばよい）
    inputRef.current?.select();
  }

  function handleBlur() {
    // 選択肢のクリック（onMouseDown）が先に発火するよう少し待ってから閉じる
    window.setTimeout(() => {
      setOpen(false);
      setFiltering(false);
      const match = employees.find((emp) => emp.name === query);
      if (match) {
        onChange(match.name);
      } else {
        setQuery(value);
      }
    }, 120);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      openFullList();
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const emp = options[highlighted];
      if (emp) selectEmployee(emp.name);
    } else if (e.key === "Escape") {
      setOpen(false);
      setFiltering(false);
      setQuery(value);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setFiltering(true);
          setHighlighted(0);
          setOpen(true);
        }}
        onFocus={handleFocus}
        onClick={() => {
          // 既にフォーカスが当たっている状態でのクリックは onFocus が発火しないため、
          // クリックでも常に全件リストを開き直す
          if (!open) openFullList();
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="タップして選択、または名前で検索"
        className="w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-9"
        required={required}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
        ▾
      </span>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {options.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">該当する社員がいません</li>}
          {options.map((emp, i) => (
            <li
              key={emp.id}
              onMouseDown={(e) => {
                // input の onBlur より先に発火させるため preventDefault で blur 自体を抑止する
                e.preventDefault();
                selectEmployee(emp.name);
              }}
              className={`cursor-pointer px-3 py-2.5 text-sm ${
                i === highlighted ? "bg-brand-50 text-brand-700" : "text-gray-700"
              } ${emp.name === value ? "font-semibold" : ""}`}
            >
              {emp.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
