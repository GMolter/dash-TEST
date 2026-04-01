-- Create quicklink_folders table
CREATE TABLE IF NOT EXISTS quicklink_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT '📁',
  order_index integer DEFAULT 0,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text DEFAULT 'personal' CHECK (scope IN ('personal', 'shared', 'both')),
  created_at timestamptz DEFAULT now()
);

-- Add folder_id to quicklinks
ALTER TABLE quicklinks ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES quicklink_folders(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE quicklink_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own folders"
  ON quicklink_folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quicklink_folders_order ON quicklink_folders(order_index);
CREATE INDEX IF NOT EXISTS idx_quicklinks_folder ON quicklinks(folder_id);
