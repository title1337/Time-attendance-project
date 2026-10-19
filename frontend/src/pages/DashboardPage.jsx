import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  LogIn,
  LogOut,
  CheckCircle,
  AlertCircle,
  Calendar,
  Briefcase,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { attendanceApi } from '../api/attendance.api';
import { scheduleApi } from '../api/schedule.api';
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
  const { data: todayStatus, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: attendanceApi.getTodayStatus,
    refetchInterval: 30000,
  });

  // Get my current assigned work shift
  const { data: shiftResponse, isLoading: isShiftLoading } = useQuery({
    queryKey: ['schedule', 'my-shift'],
    queryFn: scheduleApi.getMyCurrentShift,
    refetchInterval: 60000,
  });

  const checkInMutation = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: (data) => {
      if (data?.isLate || data?.data?.status === 'late') {
        toast((t) => (
          <span className="flex items-center gap-2">
            <span className="text-amber-300 font-bold">⚠️ ลงเวลาสาย:</span>
            <span>{data?.message || 'ลงเวลาเข้างานสาย'}</span>
          </span>
        ), {
          duration: 4500,
          style: { background: '#d97706', color: '#fff' },
        });
      } else {
        toast.success(data?.message || 'ลงเวลาเข้างานสำเร็จ!');
      }
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

  const record = todayStatus?.data;
  const checkInTime = record?.check_in_time;
  const checkOutTime = record?.check_out_time;
  const recordStatus = record?.status;
  const hasCheckedIn = Boolean(checkInTime);
  const hasCheckedOut = Boolean(checkOutTime);

  const checkInDisplay = isAttendanceLoading ? '...' : formatTimeOnly(checkInTime);
  const checkOutDisplay = isAttendanceLoading ? '...' : formatTimeOnly(checkOutTime);

  const assignedShift = shiftResponse?.data?.shift;

  // Determine dynamic badge & text for today's status
  let statusBadge = {
    text: 'ยังไม่ลงชื่อ',
    bg: 'bg-gray-100 text-gray-700',
    icon: AlertCircle,
  };

  if (isAttendanceLoading) {
    statusBadge = { text: '...', bg: 'bg-gray-100 text-gray-500', icon: AlertCircle };
  } else if (hasCheckedIn && hasCheckedOut) {
    if (recordStatus === 'late') {
      statusBadge = {
        text: 'ครบถ้วน (เข้างานสาย)',
        bg: 'bg-amber-100 text-amber-800',
        icon: AlertCircle,
      };
    } else {
      statusBadge = {
        text: 'ครบถ้วน (ปกติ)',
        bg: 'bg-emerald-100 text-emerald-800',
        icon: CheckCircle,
      };
    }
  } else if (hasCheckedIn) {
    if (recordStatus === 'late') {
      statusBadge = {
        text: 'เข้างานสาย',
        bg: 'bg-amber-100 text-amber-800',
        icon: AlertCircle,
      };
    } else {
      statusBadge = {
        text: 'เข้างานแล้ว (ปกติ)',
        bg: 'bg-emerald-100 text-emerald-800',
        icon: CheckCircle,
      };
    }
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

  const StatusIcon = statusBadge.icon;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
              สวัสดี, คุณ{user?.first_name}! 👋
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              {format(currentTime, 'EEEE dd MMMM yyyy', { locale: th })}
            </p>
          </div>
          <Link
            to="/schedule"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold transition"
          >
            <Calendar className="w-4 h-4" />
            ตารางการทำงาน
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Assigned Shift Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  กะการทำงานวันนี้
                </span>
                {recordStatus === 'late' && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    ลงเวลาสาย
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900 mt-1">
                {isShiftLoading ? 'กำลังโหลด...' : (assignedShift?.shift_name || 'กะเวลามาตรฐาน')}
              </h2>
              <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-gray-400" />
                เวลาทำงาน: <span className="font-semibold text-gray-900">{assignedShift?.start_time?.slice(0, 5) || '08:30'}</span> ถึง <span className="font-semibold text-gray-900">{assignedShift?.end_time?.slice(0, 5) || '17:30'} น.</span>
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <span className="text-xs text-gray-400 block">เกณฑ์นับสาย</span>
            <span className="text-sm font-medium text-rose-600">
              หลังเวลา {assignedShift?.start_time?.slice(0, 5) || '08:30'} น.
            </span>
          </div>
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
                <div className="flex items-baseline gap-2">
                  <p className="font-bold text-gray-900 truncate">
                    {checkInDisplay}
                  </p>
                  {recordStatus === 'late' && (
                    <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                      สาย
                    </span>
                  )}
                </div>
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
                <div className="truncate">
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${statusBadge.bg}`}>
                    {statusBadge.text}
                  </span>
                </div>
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
