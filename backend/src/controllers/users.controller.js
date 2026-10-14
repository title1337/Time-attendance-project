import supabase from '../config/supabase.js';
import { ok, badRequest, notFound, serverError } from '../utils/response.js';

const USER_FIELDS = 'id, employee_code, first_name, last_name, email, department, position, role, is_active, created_at';
const ROLES = ['employee', 'admin'];

export const listUsers = async (_req, res) => {
  try {
    const { data, error } = await supabase.from('users').select(USER_FIELDS).order('created_at', { ascending: false }).range(0, 499);
    if (error) throw error;
    return ok(res, { data });
  } catch (error) {
    return serverError(res, error, 'listUsers');
  }
};

export const updateUser = async (req, res) => {
  const updates = {};
  if (Object.hasOwn(req.body, 'role')) {
    if (!ROLES.includes(req.body.role)) return badRequest(res, 'Invalid role');
    updates.role = req.body.role;
  }
  if (Object.hasOwn(req.body, 'is_active')) {
    if (typeof req.body.is_active !== 'boolean') return badRequest(res, 'is_active must be a boolean');
    updates.is_active = req.body.is_active;
  }
  if (!Object.keys(updates).length) return badRequest(res, 'No valid fields to update');
  if (req.params.id === req.user.id && ((updates.role && updates.role !== 'admin') || updates.is_active === false)) {
    return badRequest(res, 'You cannot remove your own administrator access');
  }
  try {
    const { data, error } = await supabase.from('users').update(updates).eq('id', req.params.id).select(USER_FIELDS).maybeSingle();
    if (error) throw error;
    if (!data) return notFound(res, 'User not found');
    return ok(res, { data });
  } catch (error) {
    return serverError(res, error, 'updateUser');
  }
};
