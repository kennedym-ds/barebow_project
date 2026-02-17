-- BareTrack Database Schema
-- Mirrors SQLModel tables from src/models.py exactly
-- All primary keys are string UUIDs

CREATE TABLE IF NOT EXISTS bowsetup (
  id VARCHAR NOT NULL PRIMARY KEY,
  name VARCHAR NOT NULL,
  riser_make VARCHAR NOT NULL,
  riser_model VARCHAR NOT NULL,
  riser_length_in FLOAT NOT NULL,
  limbs_make VARCHAR NOT NULL,
  limbs_model VARCHAR NOT NULL,
  limbs_length VARCHAR NOT NULL,
  limbs_marked_poundage FLOAT NOT NULL,
  draw_weight_otf FLOAT NOT NULL,
  draw_length_in FLOAT,
  brace_height_in FLOAT NOT NULL,
  tiller_top_mm FLOAT NOT NULL,
  tiller_bottom_mm FLOAT NOT NULL,
  tiller_type VARCHAR NOT NULL,
  plunger_spring_tension FLOAT NOT NULL,
  plunger_center_shot_mm FLOAT NOT NULL,
  nocking_point_height_mm FLOAT NOT NULL,
  riser_weights VARCHAR NOT NULL DEFAULT '',
  limb_alignment VARCHAR NOT NULL DEFAULT 'Straight',
  total_mass_g FLOAT NOT NULL DEFAULT 0,
  string_material VARCHAR NOT NULL DEFAULT '',
  strand_count INTEGER NOT NULL DEFAULT 16
);

CREATE TABLE IF NOT EXISTS arrowsetup (
  id VARCHAR NOT NULL PRIMARY KEY,
  make VARCHAR NOT NULL,
  model VARCHAR NOT NULL,
  spine FLOAT NOT NULL,
  length_in FLOAT NOT NULL,
  point_weight_gr FLOAT NOT NULL,
  total_arrow_weight_gr FLOAT,
  shaft_diameter_mm FLOAT,
  fletching_type VARCHAR NOT NULL,
  nock_type VARCHAR NOT NULL,
  arrow_count INTEGER NOT NULL DEFAULT 12
);

CREATE TABLE IF NOT EXISTS arrowshaft (
  id VARCHAR NOT NULL PRIMARY KEY,
  arrow_setup_id VARCHAR NOT NULL,
  arrow_number INTEGER NOT NULL,
  measured_weight_gr FLOAT,
  measured_spine_astm FLOAT,
  straightness FLOAT,
  FOREIGN KEY (arrow_setup_id) REFERENCES arrowsetup(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tabsetup (
  id VARCHAR NOT NULL PRIMARY KEY,
  name VARCHAR NOT NULL,
  make VARCHAR NOT NULL DEFAULT 'Zniper',
  model VARCHAR NOT NULL DEFAULT 'Barebow Tab',
  marks VARCHAR NOT NULL DEFAULT '',
  tab_image_path VARCHAR,
  nock_y_px FLOAT,
  scale_mm_per_px FLOAT
);

CREATE TABLE IF NOT EXISTS session (
  id VARCHAR NOT NULL PRIMARY KEY,
  date TEXT NOT NULL,
  bow_id VARCHAR,
  arrow_id VARCHAR,
  round_type VARCHAR NOT NULL,
  target_face_size_cm INTEGER NOT NULL,
  distance_m FLOAT NOT NULL,
  notes VARCHAR NOT NULL DEFAULT '',
  FOREIGN KEY (bow_id) REFERENCES bowsetup(id),
  FOREIGN KEY (arrow_id) REFERENCES arrowsetup(id)
);

CREATE TABLE IF NOT EXISTS end (
  id VARCHAR NOT NULL PRIMARY KEY,
  session_id VARCHAR NOT NULL,
  end_number INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shot (
  id VARCHAR NOT NULL PRIMARY KEY,
  end_id VARCHAR NOT NULL,
  score INTEGER NOT NULL,
  is_x BOOLEAN NOT NULL DEFAULT 0,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  arrow_number INTEGER,
  shot_sequence INTEGER,
  FOREIGN KEY (end_id) REFERENCES end(id) ON DELETE CASCADE
);

-- Schema version tracking (mirrors src/migrations.py pattern)
CREATE TABLE IF NOT EXISTS _schema_version (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
