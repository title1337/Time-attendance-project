import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';
import {
  ok,
  created,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from '../utils/response.js';

// ─── Private helpers ─────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

const USER_PUBLIC_FIELDS = [
  'id',
  'employee_code',
  'first_name',
  'last_name',
  'email',
  'department',
  'position',
  'role',
  'is_active',
  'created_at',
];

// Check whether avatar_url column is present in users table
let hasAvatarColumnCache = null;
const checkAvatarColumn = async () => {
  if (hasAvatarColumnCache !== null) return hasAvatarColumnCache;
  try {
    const { error } = await supabase.from('users').select('avatar_url').limit(1);
    hasAvatarColumnCache = !error;
  } catch {
    hasAvatarColumnCache = false;
  }
  return hasAvatarColumnCache;
};

// Retrieve avatar from storage bucket if column is not yet present
const attachAvatarFromStorageIfMissing = async (user) => {
  if (!user || user.avatar_url) return user;
  try {
    const { data: files } = await supabase.storage.from('avatars').list('', { search: user.id });
    if (files && files.length > 0) {
      const match = files.find((f) => f.name.startsWith(user.id));
      if (match) {
        const { data: pubUrl } = supabase.storage.from('avatars').getPublicUrl(match.name);
        user.avatar_url = `${pubUrl.publicUrl}?v=${match.updated_at || Date.now()}`;
      }
    }
  } catch (_e) {
    // Graceful fallback: avatar_url remains null / undefined
  }
  return user;
};

const generateToken = ({ id, email, role, employee_code }) =>
  jwt.sign({ id, email, role, employee_code }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  });

// ─── Controllers ─────────────────────────────────────────────────────────────

/** POST /api/auth/register */
export const register = async (req, res) => {
  const {
    employee_code,
    first_name,
    last_name,
    email,
    department,
    position,
    password,
  } = req.body;

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

    const canUseAvatar = await checkAvatarColumn();
    const selectCols = canUseAvatar
      ? [...USER_PUBLIC_FIELDS, 'avatar_url'].join(', ')
      : USER_PUBLIC_FIELDS.join(', ');

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
      .select(selectCols)
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
    const canUseAvatar = await checkAvatarColumn();
    const selectCols = canUseAvatar
      ? 'id, employee_code, first_name, last_name, email, department, position, role, is_active, password_hash, avatar_url'
      : 'id, employee_code, first_name, last_name, email, department, position, role, is_active, password_hash';

    const { data: user, error } = await supabase
      .from('users')
      .select(selectCols)
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    if (!user) return unauthorized(res, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    if (!user.is_active) return unauthorized(res, 'บัญชีนี้ถูกระงับการใช้งาน');

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return unauthorized(res, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');

    const { password_hash: _pw, ...userWithoutPassword } = user;
    await attachAvatarFromStorageIfMissing(userWithoutPassword);
    const token = generateToken(user);

    return ok(res, {
      message: 'เข้าสู่ระบบสำเร็จ',
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    return serverError(res, error, 'login');
  }
};

/** GET /api/auth/me */
export const getMe = async (req, res) => {
  try {
    const canUseAvatar = await checkAvatarColumn();
    const selectCols = canUseAvatar
      ? [...USER_PUBLIC_FIELDS, 'avatar_url'].join(', ')
      : USER_PUBLIC_FIELDS.join(', ');

    const { data: user, error } = await supabase
      .from('users')
      .select(selectCols)
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return notFound(res, 'ไม่พบผู้ใช้');

    await attachAvatarFromStorageIfMissing(user);

    return ok(res, { user });
  } catch (error) {
    return serverError(res, error, 'getMe');
  }
};

/** PUT /api/auth/profile */
export const updateProfile = async (req, res) => {
  const { first_name, last_name, avatar, avatar_url: providedAvatarUrl } = req.body;

  if (!first_name || !first_name.trim()) {
    return badRequest(res, 'กรุณาระบุชื่อจริง');
  }
  if (!last_name || !last_name.trim()) {
    return badRequest(res, 'กรุณาระบุนามสกุล');
  }

  try {
    let resolvedAvatarUrl = providedAvatarUrl ?? undefined;

    // Handle base64 image upload to Supabase storage
    if (avatar && typeof avatar === 'string') {
      const match = avatar.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
        const buffer = Buffer.from(match[2], 'base64');
        const fileName = `${req.user.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          console.error('[Avatar Upload Error]', uploadError);
        } else {
          const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          resolvedAvatarUrl = `${pubData.publicUrl}?v=${Date.now()}`;
        }
      } else if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        resolvedAvatarUrl = avatar;
      }
    } else if (avatar === null || avatar === '') {
      resolvedAvatarUrl = null;
    }

    const canUseAvatar = await checkAvatarColumn();

    const updatePayload = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      updated_at: new Date().toISOString(),
    };

    if (canUseAvatar && resolvedAvatarUrl !== undefined) {
      updatePayload.avatar_url = resolvedAvatarUrl;
    }

    const selectCols = canUseAvatar
      ? [...USER_PUBLIC_FIELDS, 'avatar_url'].join(', ')
      : USER_PUBLIC_FIELDS.join(', ');

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', req.user.id)
      .select(selectCols)
      .single();

    if (updateError) throw updateError;

    if (!canUseAvatar && resolvedAvatarUrl !== undefined) {
      updatedUser.avatar_url = resolvedAvatarUrl;
    }

    return ok(res, {
      message: 'อัปเดตข้อมูลส่วนตัวสำเร็จ',
      user: updatedUser,
    });
  } catch (error) {
    return serverError(res, error, 'updateProfile');
  }
};

/** POST /api/auth/logout */
export const logout = (_req, res) => ok(res, { message: 'ออกจากระบบสำเร็จ' });
