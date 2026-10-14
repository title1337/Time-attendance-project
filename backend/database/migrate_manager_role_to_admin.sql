BEGIN;

UPDATE users
SET role = 'admin'
WHERE role = 'manager';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check,
  ADD CONSTRAINT users_role_check CHECK (role IN ('employee', 'admin'));

COMMIT;
