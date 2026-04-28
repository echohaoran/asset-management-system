export interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  asset_count: number;
}

export interface AssetLog {
  id: number;
  action: string;
  operator_id: number;
  detail: string;
  created_at: string;
}

export interface Asset {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  price: number;
  purchase_date: string;
  status: string;
  current_user_id: number | null;
  current_user_name: string | null;
  description: string;
  model: string;
  color: string;
  asset_code: string;
  sn: string;
  created_at: string;
  updated_at: string;
  logs: AssetLog[];
}

export interface DashboardStats {
  total_assets: number;
  in_stock: number;
  checked_out: number;
  disposed: number;
  total_value: number;
  category_stats: { name: string; count: number }[];
}

export interface AssetCreate {
  name: string;
  category_id: number;
  price: number;
  purchase_date: string;
  description: string;
  model: string;
  color: string;
  asset_code: string;
  sn: string;
}
