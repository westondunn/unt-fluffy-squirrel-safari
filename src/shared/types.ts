export interface Tree {
  id: number;
  unt_id: number;
  lat: number;
  lon: number;
  elevation: number;
  species: string;
  memorial: boolean;
  global_id: string;
}

export interface Hotspot {
  id: number;
  name: string;
  center_lat: number;
  center_lon: number;
  radius_m: number;
  tree_count: number;
  nut_tree_count: number;
  squirrel_score: number;
  discovered: boolean;
}

export interface Sighting {
  id: number;
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
  criteria_type: string;
  criteria_value: number;
  earned: boolean;
  earned_at: string | null;
}

export interface Quest {
  id: number;
  quest_text: string;
  target_hotspot_id: number | null;
  status: 'active' | 'completed' | 'expired';
  generated_at: string;
  completed_at: string | null;
}

export interface Player {
  score: number;
  level: number;
  total_discoveries: number;
  total_sightings: number;
  total_quests_completed: number;
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
