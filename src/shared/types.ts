export interface Tree {
  id: number;
  fid: number;
  unt_id: number;
  lat: number;
  lon: number;
  elevation: number;
  species: string; // maps to name_comn in DB
  memorial: string; // 'Y' | 'N'
  global_id: string;
}

export interface Hotspot {
  id: number;
  name: string;
  lat: number; // center latitude
  lon: number; // center longitude
  radius_m: number;
  tree_count: number;
  nut_count: number;
  score: number; // squirrel_score 1-5
  species: string; // comma-separated species list
  notes: string;
  discovered: boolean;
}

export interface Sighting {
  id: number;
  tree_id: number | null;
  hotspot_id: number | null;
  lat: number;
  lon: number;
  photo_path: string | null;
  notes: string;
  timestamp: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
  earned: boolean;
  earned_at: string | null;
}

export interface Quest {
  id: number;
  quest_type: string;
  target_id: number | null;
  status: 'active' | 'completed' | 'expired';
  started_at: string;
  completed_at: string | null;
}

export interface Player {
  id: number;
  name: string;
  level: number;
  xp: number;
  score: number;
  streak: number;
  last_seen: string | null;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}
