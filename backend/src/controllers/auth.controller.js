import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';
import { ok, created, badRequest, unauthorized, notFound, serverError } from '../utils/response.js';

// ─── Private helpers ─────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

const USER_PUBLIC_FIELDS = [
  'id', 'employee_code', 'first_name', 'last_name',
  'email', 'department', 'position', 'role',
  'is_active', 'created_at',
];

const generateToken = ({ id, email, role, employee_code }) =>
  jwt.sign(
    { id, email, role, employee_code },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  );

// ─── Controllers ─────────────────────────────────────────────────────────────

/** POST /api/auth/register */
export const register = async (req, res) => {
  const { employee_code, first_name, last_name, email, department, position, password } = req.body;

  try {
    // Check duplicate email
    const { data: byEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (byEmail) return badRequest(res, 'อีเมลนี้ถูกใช้งานแล้ว');

    // Check duplicate employee_code
    const { data: byCode } = await supabase
      .from('users')
      .select('id')
      .eq('employee_code', employee_code)
      .maybeSingle();

    if (byCode) return badRequest(res, 'รหัสพนักงานนี้ถูกใช้งานแล้ว');

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        employee_code,
        first_name,
        last_name,
        email,
        department,
        position,
        role: 'employee',
        is_active: true,
        password_hash,
      })
      .select(USER_PUBLIC_FIELDS.join(', '))
      .single();

    if (error) throw error;

    const token = generateToken(user);

    return created(res, { message: 'ลงทะเบียนสำเร็จ', user, token });
  } catch (error) {
    return serverError(res, error, 'register');
  }
};

/** POST /api/auth/login */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, employee_code, first_name, last_name, email, department, position, role, is_active, password_hash')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    if (!user) return unauthorized(res, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    if (!user.is_active) return unauthorized(res, 'บัญชีนี้ถูกระงับการใช้งาน');

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return unauthorized(res, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');

    const { password_hash: _pw, ...userWithoutPassword } = user;
    const token = generateToken(user);

    return ok(res, { message: 'เข้าสู่ระบบสำเร็จ', user: userWithoutPassword, token });
  } catch (error) {
    return serverError(res, error, 'login');
  }
};

/** GET /api/auth/me */
export const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select(USER_PUBLIC_FIELDS.join(', '))
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return notFound(res, 'ไม่พบผู้ใช้');

    return ok(res, { user });
  } catch (error) {
    return serverError(res, error, 'getMe');
  }
};

/** POST /api/auth/logout */
export const logout = (_req, res) =>
  ok(res, { message: 'ออกจากระบบสำเร็จ' });
