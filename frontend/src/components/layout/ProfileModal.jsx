import { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Trash2,
  User,
  Mail,
  Briefcase,
  Building2,
  ShieldCheck,
  Hash,
  Loader2,
  Check,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUser } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarData, setAvatarData] = useState(undefined); // undefined: untouched, null: removed, string: new base64
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Sync state whenever modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setAvatarPreview(user.avatar_url || null);
      setAvatarData(undefined);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const initials = `${firstName?.[0] || user?.first_name?.[0] || ''}${
    lastName?.[0] || user?.last_name?.[0] || ''
  }`.toUpperCase();

  // Compress & convert selected file using HTML Canvas
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarPreview(compressedDataUrl);
        setAvatarData(compressedDataUrl);
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) {
      toast.error('กรุณากรอกชื่อจริง');
      return;
    }
    if (!trimmedLast) {
      toast.error('กรุณากรอกนามสกุล');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        first_name: trimmedFirst,
        last_name: trimmedLast,
      };

      if (avatarData !== undefined) {
        payload.avatar = avatarData;
      }

      const res = await authApi.updateProfile(payload);

      if (res.success && res.data?.user) {
        updateUser(res.data.user);
        toast.success(res.message || 'บันทึกข้อมูลส่วนตัวเรียบร้อย');
        onClose();
      } else {
        toast.error(res.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 to-indigo-800 text-white">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-indigo-300" />
            <h2 className="text-lg font-bold">แก้ไขโปรไฟล์</h2>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Avatar Edit Section */}
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="relative group shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-indigo-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-3xl font-bold shadow-md border-4 border-white ring-2 ring-indigo-200">
                  {initials || <User className="w-10 h-10" />}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition transform active:scale-95"
                title="เลือกรูปภาพ"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">รูปภาพโปรไฟล์</h3>
              <p className="text-xs text-gray-500">
                รองรับไฟล์ JPG, PNG หรือ WebP (ระบบจะปรับขนาดให้อัตโนมัติ)
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:border-indigo-400 text-gray-700 hover:text-indigo-600 rounded-lg text-xs font-medium transition shadow-sm"
                >
                  เลือกรูปใหม่
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3 py-1.5 bg-white border border-red-200 hover:border-red-400 text-red-600 rounded-lg text-xs font-medium transition shadow-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    ลบรูป
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Editable Fields: First name & Last name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                ชื่อจริง <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="ชื่อจริง"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-800 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="นามสกุล"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-800 transition"
              />
            </div>
          </div>

          {/* Read-only / Organization Information */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              ข้อมูลในระบบ (อ่านอย่างเดียว)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 flex items-center gap-2.5">
                <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-gray-400 block">รหัสพนักงาน</span>
                  <span className="font-semibold text-gray-700 truncate block">
                    {user?.employee_code || '—'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-gray-400 block">อีเมล</span>
                  <span className="font-semibold text-gray-700 truncate block">
                    {user?.email || '—'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-gray-400 block">แผนก</span>
                  <span className="font-semibold text-gray-700 truncate block">
                    {user?.department || '—'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-gray-400 block">ตำแหน่ง</span>
                  <span className="font-semibold text-gray-700 truncate block">
                    {user?.position || '—'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 flex items-center gap-2.5 sm:col-span-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="min-w-0 flex items-center justify-between w-full">
                  <div>
                    <span className="text-gray-400 block">สิทธิ์การใช้งาน</span>
                    <span className="font-semibold text-gray-800">
                      {user?.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'พนักงาน (Employee)'}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      user?.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {user?.role === 'admin' ? 'Admin' : 'Employee'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-200 transition disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  บันทึกการเปลี่ยนแปลง
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
