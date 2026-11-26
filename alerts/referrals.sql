CREATE TABLE IF NOT EXISTS referral_counts (
  day TEXT NOT NULL,
  source TEXT NOT NULL,
  page TEXT NOT NULL,
  landings INTEGER NOT NULL,
  PRIMARY KEY (day, source, page)
) WITHOUT ROWID;
