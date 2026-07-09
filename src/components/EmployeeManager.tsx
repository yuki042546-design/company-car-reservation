"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Employee } from "@/lib/types";
import { useI18n } from "./LocaleProvider";

interface EmployeeManagerProps {
  employees: Employee[];
}

interface EditFields {
  name: string;
  department: string;
  age: string; // 入力中は文字列で保持し、保存時に数値へ変換する
}

function parseAge(value: string): { ok: true; age: number | null } | { ok: false } {
  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, age: null };
  const n = Number(trimmed);
  if (!Number.isInteger(n)) return { ok: false };
  return { ok: true, age: n };
}

export function EmployeeManager({ employees }: EmployeeManagerProps) {
  const { dict } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<EditFields>({ name: "", department: "", age: "" });

  const [newName, setNewName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newAge, setNewAge] = useState("");
  const [adding, setAdding] = useState(false);

  function startEdit(employee: Employee) {
    setError(null);
    setEditingId(employee.id);
    setEditFields({
      name: employee.name,
      department: employee.department ?? "",
      age: employee.age !== null ? String(employee.age) : "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveEdit(id: string) {
    setError(null);
    if (!editFields.name.trim()) {
      setError(dict.employees.nameRequired);
      return;
    }
    const parsedAge = parseAge(editFields.age);
    if (!parsedAge.ok) {
      setError(dict.employees.ageInteger);
      return;
    }

    setBusyId(id);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFields.name.trim(),
          department: editFields.department.trim() || null,
          age: parsedAge.age,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.employees.genericError);
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setError(dict.employees.networkError);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(employee: Employee) {
    setError(null);
    setBusyId(employee.id);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !employee.isActive }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.employees.genericError);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.employees.networkError);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newName.trim()) {
      setError(dict.employees.nameRequired);
      return;
    }
    const parsedAge = parseAge(newAge);
    if (!parsedAge.ok) {
      setError(dict.employees.ageInteger);
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          department: newDepartment.trim() || null,
          age: parsedAge.age,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors?.[0] ?? dict.employees.addError);
        return;
      }
      setNewName("");
      setNewDepartment("");
      setNewAge("");
      router.refresh();
    } catch {
      setError(dict.employees.networkError);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg border border-danger-border bg-danger-soft p-2 text-sm text-danger">{error}</p>}

      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {employees.map((emp) => (
          <li key={emp.id} className="px-4 py-3">
            {editingId === emp.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    value={editFields.name}
                    onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))}
                    placeholder={dict.employees.namePlaceholder}
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    value={editFields.department}
                    onChange={(e) => setEditFields((f) => ({ ...f, department: e.target.value }))}
                    placeholder={dict.employees.departmentPlaceholder}
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editFields.age}
                    onChange={(e) => setEditFields((f) => ({ ...f, age: e.target.value }))}
                    placeholder={dict.employees.agePlaceholder}
                    min={0}
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(emp.id)}
                    disabled={busyId === emp.id}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {busyId === emp.id ? dict.common.saving : dict.common.save}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={busyId === emp.id}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {dict.common.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className={emp.isActive ? "text-gray-800" : "text-gray-400 line-through"}>{emp.name}</div>
                  {(emp.department || emp.age !== null) && (
                    <div className="mt-0.5 text-xs text-gray-400">
                      {[emp.department, emp.age !== null ? dict.employees.ageLabel(emp.age) : null]
                        .filter(Boolean)
                        .join(" ・ ")}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => startEdit(emp)}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {dict.common.edit}
                  </button>
                  <button
                    onClick={() => toggleActive(emp)}
                    disabled={busyId === emp.id}
                    className={
                      emp.isActive
                        ? "rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        : "rounded-lg border border-brand-100 bg-brand-50 px-3 py-1 text-xs text-brand-600 hover:bg-brand-100 disabled:opacity-50"
                    }
                  >
                    {emp.isActive ? dict.employees.deactivate : dict.employees.activate}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-xs font-semibold text-gray-500">{dict.employees.addSectionTitle}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={dict.employees.namePlaceholder}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
          />
          <input
            type="text"
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            placeholder={dict.employees.departmentPlaceholder}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
          />
          <input
            type="number"
            inputMode="numeric"
            value={newAge}
            onChange={(e) => setNewAge(e.target.value)}
            placeholder={dict.employees.agePlaceholder}
            min={0}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {adding ? dict.common.adding : dict.common.add}
        </button>
      </form>
      <p className="text-xs text-gray-400">{dict.employees.footnote}</p>
    </div>
  );
}
