CREATE TABLE IF NOT EXISTS referral_counts (
  day TEXT NOT NULL,
  source TEXT NOT NULL,
  page TEXT NOT NULL,
  landings INTEGER NOT NULL,
  PRIMARY KEY (day, source, page)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS daily_metrics (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  label TEXT NOT NULL,
  events INTEGER NOT NULL,
  PRIMARY KEY (day, metric, label)
) WITHOUT ROWID;
