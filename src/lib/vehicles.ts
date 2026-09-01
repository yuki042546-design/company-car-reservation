import { getSupabaseAdmin } from "./supabaseAdmin";
import { mapVehicleRow, type VehicleRow } from "./mappers";
import type { Vehicle } from "./types";

/** 有効な車両の一覧（予約フォームの車両選択・ホーム画面の状態バナー用）。 */
export async function getActiveVehicles(): Promise<Vehicle[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as VehicleRow[]).map(mapVehicleRow);
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
