/*
  New Quick Links are personal unless the creating surface explicitly marks
  them as shared (Organization -> Shared Links).
*/

ALTER TABLE quicklinks
ALTER COLUMN scope SET DEFAULT 'personal';
