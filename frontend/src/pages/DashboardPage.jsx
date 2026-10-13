import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  LogIn,
  LogOut,
  CheckCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { attendanceApi } from '../api/attendance.api';
import useAuthStore from '../store/authStore';
import MainLayout from '../components/layout/MainLayout';

function formatTimeOnly(timeString) {
  if (!timeString) {
    return '--:--';
  }
  const date = new Date(`2000-01-01T${timeString}`);
  return format(date, 'HH:mm');
}

function DashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get today's attendance status
  const { data: todayStatus, isLoading } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: attendanceApi.getTodayStatus,
    refetchInterval: 30000,
  });

  const checkInMutation = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: () => {
      toast.success('ลงเวลาเข้างานสำเร็จ!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'),
  });

  const checkOutMutation = useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: () => {
      toast.success('ลงเวลาออกงานสำเร็จ!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'),
  });

  const checkInTime = todayStatus?.data?.check_in_time;
  const checkOutTime = todayStatus?.data?.check_out_time;
  const hasCheckedIn = Boolean(checkInTime);
  const hasCheckedOut = Boolean(checkOutTime);

  const checkInDisplay = isLoading ? '...' : formatTimeOnly(checkInTime);
  const checkOutDisplay = isLoading ? '...' : formatTimeOnly(checkOutTime);

  let statusText = 'ยังไม่ลงชื่อ';
  if (hasCheckedIn && hasCheckedOut) {
    statusText = 'ครบถ้วน';
  } else if (hasCheckedIn) {
    statusText = 'เข้างานแล้ว';
  }
  if (isLoading) {
    statusText = '...';
  }

  const isCheckInDisabled = hasCheckedIn || checkInMutation.isPending;
  const isCheckOutDisabled =
    !hasCheckedIn || hasCheckedOut || checkOutMutation.isPending;

  const buttonBaseClass =
    'flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all';

  const checkInButtonClass = hasCheckedIn
    ? `${buttonBaseClass} bg-white/20 cursor-not-allowed`
    : `${buttonBaseClass} bg-white text-indigo-600 hover:bg-indigo-50 shadow-md hover:shadow-lg`;

  const checkOutButtonClass =
    !hasCheckedIn || hasCheckedOut
      ? `${buttonBaseClass} bg-white/20 cursor-not-allowed`
      : `${buttonBaseClass} bg-red-400 hover:bg-red-500 text-white shadow-md hover:shadow-lg`;

  const StatusIcon = hasCheckedIn && hasCheckedOut ? CheckCircle : AlertCircle;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
            สวัสดี, คุณ{user?.first_name}! 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            {format(currentTime, 'EEEE dd MMMM yyyy', { locale: th })}
          </p>
        </div>

        {/* Clock Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 sm:p-8 text-white text-center shadow-lg">
          <div className="text-4xl sm:text-6xl font-bold tracking-wide font-mono">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <p className="text-indigo-200 mt-2 text-sm">เวลาปัจจุบัน</p>

          {/* Check In/Out Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => checkInMutation.mutate({})}
              disabled={isCheckInDisabled}
              className={checkInButtonClass}
            >
              <LogIn className="w-5 h-5" />
              {hasCheckedIn ? 'ลงชื่อแล้ว' : 'ลงชื่อเข้างาน'}
            </button>

            <button
              onClick={() => checkOutMutation.mutate({})}
              disabled={isCheckOutDisabled}
              className={checkOutButtonClass}
            >
              <LogOut className="w-5 h-5" />
              {hasCheckedOut ? 'ออกแล้ว' : 'ลงชื่อออกงาน'}
            </button>
          </div>
        </div>

        {/* Today Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 bg-green-100 rounded-lg flex items-center justify-center">
                <LogIn className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">เวลาเข้างาน</p>
                <p className="font-bold text-gray-900 truncate">
                  {checkInDisplay}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 bg-red-100 rounded-lg flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">เวลาออกงาน</p>
                <p className="font-bold text-gray-900 truncate">
                  {checkOutDisplay}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 bg-blue-100 rounded-lg flex items-center justify-center">
                <StatusIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">สถานะวันนี้</p>
                <p className="font-bold text-gray-900 truncate">{statusText}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">ข้อมูลพนักงาน</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="min-w-0">
              <p className="text-gray-500">รหัสพนักงาน</p>
              <p className="font-medium text-gray-900 break-words">
                {user?.employee_code || '-'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500">แผนก</p>
              <p className="font-medium text-gray-900 break-words">
                {user?.department || '-'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500">ตำแหน่ง</p>
              <p className="font-medium text-gray-900 break-words">
                {user?.position || '-'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-gray-500">สิทธิ์</p>
              <p className="font-medium text-gray-900 capitalize break-words">
                {user?.role || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default DashboardPage;
