import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus, Clock } from 'lucide-react';
import { authApi } from '../../api/auth.api';

const registerSchema = z.object({
  employee_code: z.string().min(1, 'กรุณากรอกรหัสพนักงาน'),
  first_name: z.string().min(1, 'กรุณากรอกชื่อ'),
  last_name: z.string().min(1, 'กรุณากรอกนามสกุล'),
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  department: z.string().min(1, 'กรุณากรอกแผนก'),
  position: z.string().min(1, 'กรุณากรอกตำแหน่ง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirmPassword'],
});

function RegisterPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      toast.success('ลงทะเบียนสำเร็จ! กรุณาเข้าสู่ระบบ');
      navigate('/login');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'ลงทะเบียนไม่สำเร็จ');
    },
  });

  const onSubmit = (data) => {
    const { confirmPassword, ...rest } = data;
    registerMutation.mutate(rest);
  };

  const inputClass = (fieldError) =>
    `w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm ${
      fieldError ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-full mb-3">
            <Clock className="w-7 h-7 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ลงทะเบียนพนักงาน</h1>
          <p className="text-gray-500 text-sm mt-1">สร้างบัญชีผู้ใช้ใหม่</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Employee Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสพนักงาน</label>
            <input {...register('employee_code')} placeholder="EMP001" className={inputClass(errors.employee_code)} />
            {errors.employee_code && <p className="mt-1 text-xs text-red-600">{errors.employee_code.message}</p>}
          </div>

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
              <input {...register('first_name')} placeholder="ชื่อ" className={inputClass(errors.first_name)} />
              {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
              <input {...register('last_name')} placeholder="นามสกุล" className={inputClass(errors.last_name)} />
              {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input type="email" {...register('email')} placeholder="example@company.com" className={inputClass(errors.email)} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          {/* Department & Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">แผนก</label>
              <input {...register('department')} placeholder="IT, HR, Finance..." className={inputClass(errors.department)} />
              {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
              <input {...register('position')} placeholder="Developer, Manager..." className={inputClass(errors.position)} />
              {errors.position && <p className="mt-1 text-xs text-red-600">{errors.position.message}</p>}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input type="password" {...register('password')} placeholder="••••••••" className={inputClass(errors.password)} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
            <input type="password" {...register('confirmPassword')} placeholder="••••••••" className={inputClass(errors.confirmPassword)} />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 mt-2"
          >
            {registerMutation.isPending ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            {registerMutation.isPending ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          มีบัญชีอยู่แล้ว?{' '}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
