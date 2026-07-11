import { getSupabaseAdmin } from "./supabaseAdmin";
import { mapVehicleRow, type VehicleRow } from "./mappers";
import type { Vehicle } from "./types";

/**
 * 現在は車両1台の運用のため、予約フォームで車両選択を強制しない。
 * 有効な車両のうち最初の1台を「既定車両」として扱う。
 * 2台目以降を追加した場合は、この関数の呼び出し元（予約フォーム等）に
 * 車両選択UIを追加するだけで対応できる（内部データは常にvehicle_idを持つため）。
 */
export async function getDefaultVehicle(): Promise<Vehicle | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapVehicleRow(data as VehicleRow) : null;
}

export async function getAllVehicles(): Promise<Vehicle[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data as VehicleRow[]).map(mapVehicleRow);
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapVehicleRow(data as VehicleRow) : null;
}
