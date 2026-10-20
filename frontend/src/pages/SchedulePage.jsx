import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle,
  X,
  Search,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { th } from 'date-fns/locale';
import MainLayout from '../components/layout/MainLayout';
import { scheduleApi } from '../api/schedule.api';
import useAuthStore from '../store/authStore';
import { useDebounce } from '../hooks/useDebounce';

const THAI_DAY_ABBR = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function formatTime(str) {
  if (!str) return '--:--';
  return str.slice(0, 5);
}

// Convert shift name to short code and color matching user's reference table
function getShiftBadge(shift) {
  if (!shift) {
    return { code: '-', bg: 'bg-gray-50 text-gray-400 border-gray-200' };
  }

  const name = shift.shift_name || '';

  // Check code in name e.g. "กะเช้า (Morning)", "วันหยุด (H)", "ลาป่วย (E)"
  if (name.includes('(H)') || name.includes('วันหยุด')) {
    return {
      code: 'H',
      bg: 'bg-red-600 text-white font-bold border-red-700',
      isHoliday: true,
    };
  }
  if (name.includes('(E)') || name.includes('ลาป่วย')) {
    return {
      code: 'E',
      bg: 'bg-yellow-400 text-black font-bold border-yellow-500',
      isLeave: 'sick',
    };
  }
  if (name.includes('(P)') || name.includes('ลากิจ')) {
    return {
      code: 'P',
      bg: 'bg-green-500 text-white font-bold border-green-600',
      isLeave: 'personal',
    };
  }
  if (name.includes('(L)') || name.includes('ลาพักร้อน')) {
    return {
      code: 'L',
      bg: 'bg-orange-500 text-white font-bold border-orange-600',
      isLeave: 'annual',
    };
  }
  if (name.includes('บ่าย') || name.includes('(B)')) {
    return {
      code: 'B',
      bg: 'bg-pink-300 text-pink-950 font-bold border-pink-400',
    };
  }
  if (name.includes('ดึก') || name.includes('(C)')) {
    return {
      code: 'C',
      bg: 'bg-purple-300 text-purple-950 font-bold border-purple-400',
    };
  }

  // Default working shift (A = กะเช้า/กะมาตรฐาน) - Sky blue
  return {
    code: 'A',
    bg: 'bg-sky-400 text-sky-950 font-bold border-sky-500',
  };
}

export default function SchedulePage() {
  const { user, isManager } = useAuthStore();
  const queryClient = useQueryClient();
  const canManage = isManager();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'shifts'
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Modal 1: Shift Template Create/Edit
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    shift_name: '',
    start_time: '08:30',
    end_time: '17:30',
  });

  // Modal 2: Cell Click to Assign Shift for Specific Employee on Specific Date
  const [cellModal, setCellModal] = useState({
    isOpen: false,
    employee: null,
    dateStr: '',
    dayNum: null,
    currentShift: null,
  });

  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [assignmentMode, setAssignmentMode] = useState('preset'); // 'preset' | 'custom'
  const [customShiftForm, setCustomShiftForm] = useState({
    shift_name: '',
    start_time: '08:30',
    end_time: '17:30',
  });

  // Queries
  const { data: shiftsData, isLoading: loadingShifts } = useQuery({
    queryKey: ['schedules', 'shifts'],
    queryFn: scheduleApi.getAllShifts,
  });

  const { data: userShiftsData, isLoading: loadingMatrix } = useQuery({
    queryKey: ['schedules', 'user-shifts', currentMonth, currentYear],
    queryFn: () =>
      scheduleApi.getAllUserShifts({ month: currentMonth, year: currentYear }),
  });

  const { data: myShiftData } = useQuery({
    queryKey: ['schedule', 'my-shift'],
    queryFn: scheduleApi.getMyCurrentShift,
  });

  // Mutations
  const createShiftMutation = useMutation({
    mutationFn: scheduleApi.createShift,
    onSuccess: () => {
      toast.success('สร้างกะการทำงานเรียบร้อย');
      setIsShiftModalOpen(false);
      resetShiftForm();
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'),
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => scheduleApi.updateShift(id, data),
    onSuccess: () => {
      toast.success('อัปเดตกะการทำงานเรียบร้อย');
      setIsShiftModalOpen(false);
      resetShiftForm();
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: scheduleApi.deleteShift,
    onSuccess: () => {
      toast.success('ลบกะการทำงานสำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || 'ไม่สามารถลบกะนี้ได้'),
  });

  const assignMutation = useMutation({
    mutationFn: scheduleApi.assignShift,
    onSuccess: () => {
      toast.success('บันทึกกะสำหรับวันที่เลือกเรียบร้อยแล้ว');
      closeCellModal();
      queryClient.invalidateQueries({ queryKey: ['schedules', 'user-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', 'my-shift'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกกะ'),
  });

  const resetShiftForm = () => {
    setEditingShift(null);
    setShiftForm({
      shift_name: '',
      start_time: '08:30',
      end_time: '17:30',
    });
  };

  const handleOpenCreateShift = () => {
    resetShiftForm();
    setIsShiftModalOpen(true);
  };

  const handleOpenEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      shift_name: shift.shift_name,
      start_time: formatTime(shift.start_time),
      end_time: formatTime(shift.end_time),
    });
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = (e) => {
    e.preventDefault();
    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, data: shiftForm });
    } else {
      createShiftMutation.mutate(shiftForm);
    }
  };

  // Open Cell Click Modal to choose shift directly for a specific day
  const handleCellClick = (employee, dateStr, dayNum, currentAssignedShift) => {
    // Admin, manager, or the employee themselves can edit the schedule
    const isOwnRow = employee.id === user?.id;
    const canEditCell = canManage || isOwnRow;

    if (!canEditCell) {
      toast.error('คุณสามารถจัดการตารางการทำงานของตนเองเท่านั้น');
      return;
    }

    setCellModal({
      isOpen: true,
      employee,
      dateStr,
      dayNum,
      currentShift: currentAssignedShift,
    });

    setSelectedShiftId(
      currentAssignedShift?.id || shiftsData?.data?.[0]?.id || '',
    );
    setAssignmentMode('preset');
    setCustomShiftForm({
      shift_name: '',
      start_time: currentAssignedShift?.start_time
        ? formatTime(currentAssignedShift.start_time)
        : '08:30',
      end_time: currentAssignedShift?.end_time
        ? formatTime(currentAssignedShift.end_time)
        : '17:30',
    });
  };

  const closeCellModal = () => {
    setCellModal({
      isOpen: false,
      employee: null,
      dateStr: '',
      dayNum: null,
      currentShift: null,
    });
  };

  const handleSaveCellAssignment = (e) => {
    e.preventDefault();
    if (assignmentMode === 'custom') {
      if (!customShiftForm.start_time || !customShiftForm.end_time) {
        toast.error('กรุณาระบุเวลาเริ่มและเลิกงาน');
        return;
      }
      assignMutation.mutate({
        user_id: cellModal.employee.id,
        effective_date: cellModal.dateStr,
        is_custom: true,
        custom_name: customShiftForm.shift_name,
        custom_start_time: customShiftForm.start_time,
        custom_end_time: customShiftForm.end_time,
      });
    } else {
      if (!selectedShiftId) {
        toast.error('กรุณาเลือกกะการทำงาน');
        return;
      }
      assignMutation.mutate({
        user_id: cellModal.employee.id,
        effective_date: cellModal.dateStr,
        shift_id: selectedShiftId,
      });
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Calculate days in the selected month
  const daysInCurrentMonth = useMemo(() => {
    const dateObj = new Date(currentYear, currentMonth - 1, 1);
    const totalDays = getDaysInMonth(dateObj);
    const daysArr = [];

    for (let d = 1; d <= totalDays; d++) {
      const cur = new Date(currentYear, currentMonth - 1, d);
      const dayOfWeek = getDay(cur); // 0=Sun, 6=Sat
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArr.push({
        dayNum: d,
        dateStr,
        dayOfWeek,
        dayAbbr: THAI_DAY_ABBR[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }
    return daysArr;
  }, [currentYear, currentMonth]);

  const shifts = shiftsData?.data || [];
  const rawUsers = userShiftsData?.data || [];
  const myCurrentShift = myShiftData?.data?.shift;

  // Filter users by search term
  const filteredUsers = useMemo(() => {
    if (!debouncedSearch) return rawUsers;
    const q = debouncedSearch.toLowerCase();
    return rawUsers.filter((u) => {
      const fullName =
        `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const code = (u.employee_code || '').toLowerCase();
      const dept = (u.department || '').toLowerCase();
      return fullName.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [rawUsers, debouncedSearch]);

  const monthTitle = format(
    new Date(currentYear, currentMonth - 1, 1),
    'MMMM',
    { locale: th },
  );
  const thaiBuddhistYear = currentYear + 543;

  return (
    <MainLayout>
      <div className="max-w-full space-y-5">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-indigo-600" />
              ตารางการทำงาน ({monthTitle} {thaiBuddhistYear})
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
              คลิกที่ช่องวันที่ของพนักงานเพื่อเลือกหรือแก้ไขกะการทำงานได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Month Selector */}
            <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs sm:text-sm font-bold text-gray-800 select-none">
                {monthTitle} {thaiBuddhistYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex bg-gray-200/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'matrix'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> ตารางเวรรายเดือน
              </button>
              <button
                onClick={() => setActiveTab('shifts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'shifts'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> จัดการกะ (Shifts)
              </button>
            </div>
          </div>
        </div>

        {/* Legend / Shift Code Badges matching image */}
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-gray-700 flex items-center gap-1">
            <Info className="w-4 h-4 text-indigo-500" /> สัญลักษณ์กะ:
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-sky-400 text-sky-950 border border-sky-500">
              A
            </span>
            <span>กะเช้า / กะมาตรฐาน (08:30 - 17:30)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-pink-300 text-pink-950 border border-pink-400">
              B
            </span>
            <span>กะบ่าย (13:00 - 22:00)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-purple-300 text-purple-950 border border-purple-400">
              C
            </span>
            <span>กะดึก (22:00 - 07:00)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-red-600 text-white border border-red-700">
              H
            </span>
            <span>วันหยุดประจำสัปดาห์ / วันหยุด</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-yellow-400 text-black border border-yellow-500">
              E
            </span>
            <span>ลาป่วย</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-green-500 text-white border border-green-600">
              P
            </span>
            <span>ลากิจ</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-orange-500 text-white border border-orange-600">
              L
            </span>
            <span>ลาพักร้อน</span>
          </span>
        </div>

        {/* Tab 1: Monthly Roster Grid Table (ตรงตามรูปภาพเป๊ะๆ) */}
        {activeTab === 'matrix' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-300 overflow-hidden space-y-3 p-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัสพนักงาน, แผนก..."
                  className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <span className="text-xs text-gray-500 self-center sm:self-auto">
                พนักงานทั้งหมด {filteredUsers.length} คน
                (คลิกที่ช่องวันที่เพื่อกำหนดกะ)
              </span>
            </div>

            {loadingMatrix ? (
              <div className="py-16 text-center text-gray-400">
                กำลังโหลดตารางเวร...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                ไม่พบรายชื่อพนักงาน
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-300 rounded-xl">
                <table className="border-collapse text-xs select-none w-full min-w-max">
                  {/* Top Green Banner */}
                  <thead>
                    <tr className="bg-[#bbf7d0] text-gray-900 font-bold border-b border-gray-300">
                      <th
                        colSpan={3}
                        className="py-1.5 px-3 text-left border-r border-gray-300 font-semibold"
                      >
                        ระบบลงเวลาการทำงาน
                      </th>
                      <th
                        colSpan={daysInCurrentMonth.length}
                        className="py-1.5 px-2 text-center border-r border-gray-300 text-xs sm:text-sm"
                      >
                        ตารางการทำงาน เดือน {monthTitle} {thaiBuddhistYear}
                      </th>
                      <th
                        colSpan={4}
                        className="py-1.5 px-2 text-center text-xs"
                      >
                        สรุปวันลา / หยุด
                      </th>
                    </tr>

                    {/* Row 1: Day Numbers 1..31 */}
                    <tr className="bg-[#e5e7eb] text-gray-800 font-bold border-b border-gray-300 text-center">
                      <th className="py-2 px-2 border-r border-gray-300 w-10 text-center">
                        ลำดับ
                      </th>
                      <th className="py-2 px-3 border-r border-gray-300 min-w-[140px] text-left">
                        ชื่อพนักงาน
                      </th>
                      <th className="py-2 px-3 border-r border-gray-300 min-w-[100px] text-left">
                        แผนก
                      </th>

                      {/* Day Numbers */}
                      {daysInCurrentMonth.map((day) => (
                        <th
                          key={day.dayNum}
                          className={`py-1.5 px-1 w-8 min-w-[28px] border-r border-gray-300 text-center font-bold ${
                            day.isWeekend
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {day.dayNum}
                        </th>
                      ))}

                      {/* Summary Columns */}
                      <th className="py-2 px-1.5 w-10 border-r border-gray-300 text-center bg-red-600 text-white font-bold">
                        H
                      </th>
                      <th className="py-2 px-1.5 w-10 border-r border-gray-300 text-center bg-yellow-400 text-black font-bold">
                        E (ป่วย)
                      </th>
                      <th className="py-2 px-1.5 w-10 border-r border-gray-300 text-center bg-green-500 text-white font-bold">
                        P (กิจ)
                      </th>
                      <th className="py-2 px-1.5 w-10 border-gray-300 text-center bg-orange-500 text-white font-bold">
                        L (พักร้อน)
                      </th>
                    </tr>

                    {/* Row 2: Day of Week (อา., จ., อ., ...) */}
                    <tr className="bg-[#f3f4f6] text-gray-700 text-center border-b border-gray-300 font-medium">
                      <th className="py-1 border-r border-gray-300"></th>
                      <th className="py-1 border-r border-gray-300"></th>
                      <th className="py-1 border-r border-gray-300"></th>

                      {daysInCurrentMonth.map((day) => (
                        <th
                          key={day.dayNum}
                          className={`py-1 px-1 border-r border-gray-300 text-[10px] ${
                            day.isWeekend
                              ? 'bg-red-50 text-red-600 font-bold'
                              : 'text-gray-600'
                          }`}
                        >
                          {day.dayAbbr}
                        </th>
                      ))}

                      <th className="py-1 border-r border-gray-300 bg-red-50 text-[10px] text-red-700">
                        หยุด
                      </th>
                      <th className="py-1 border-r border-gray-300 bg-yellow-50 text-[10px] text-yellow-800">
                        ป่วย
                      </th>
                      <th className="py-1 border-r border-gray-300 bg-green-50 text-[10px] text-green-800">
                        กิจ
                      </th>
                      <th className="py-1 border-gray-300 bg-orange-50 text-[10px] text-orange-800">
                        พัก
                      </th>
                    </tr>
                  </thead>

                  {/* Body: Employees Rows */}
                  <tbody className="divide-y divide-gray-300">
                    {filteredUsers.map((emp, index) => {
                      const isMe = emp.id === user?.id;

                      // Count stats for summary columns
                      let countH = 0;
                      let countE = 0;
                      let countP = 0;
                      let countL = 0;

                      daysInCurrentMonth.forEach((day) => {
                        const assigned =
                          emp.daily_schedules?.[day.dateStr]?.shift;
                        const defaultShift = emp.default_shift;
                        const currentShift =
                          assigned ||
                          (day.isWeekend
                            ? { shift_name: 'วันหยุด (H)' }
                            : defaultShift);
                        const badge = getShiftBadge(currentShift);

                        if (badge.isHoliday) countH++;
                        if (badge.isLeave === 'sick') countE++;
                        if (badge.isLeave === 'personal') countP++;
                        if (badge.isLeave === 'annual') countL++;
                      });

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-indigo-50/40 transition border-b border-gray-300 ${
                            isMe ? 'bg-indigo-50/30' : 'bg-white'
                          }`}
                        >
                          {/* Row Index */}
                          <td className="py-2 px-2 text-center border-r border-gray-300 font-medium text-gray-500">
                            {index + 1}
                          </td>

                          {/* Employee Name */}
                          <td className="py-2 px-3 border-r border-gray-300 font-semibold text-gray-900 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              {emp.first_name} {emp.last_name}
                              {isMe && (
                                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                                  ฉัน
                                </span>
                              )}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="py-2 px-3 border-r border-gray-300 text-gray-600 whitespace-nowrap">
                            {emp.department || '-'}
                          </td>

                          {/* Day Cells (Interactive Click to Choose Shift) */}
                          {daysInCurrentMonth.map((day) => {
                            const assigned =
                              emp.daily_schedules?.[day.dateStr]?.shift;
                            const defaultShift = emp.default_shift;

                            // If not set specifically for this date:
                            // weekends default to Holiday (H), weekdays default to user's assigned default shift
                            const currentShift =
                              assigned ||
                              (day.isWeekend
                                ? { shift_name: 'วันหยุด (H)' }
                                : defaultShift);

                            const badge = getShiftBadge(currentShift);
                            const canEdit = canManage || isMe;

                            return (
                              <td
                                key={day.dayNum}
                                onClick={() =>
                                  handleCellClick(
                                    emp,
                                    day.dateStr,
                                    day.dayNum,
                                    currentShift,
                                  )
                                }
                                className={`p-0 border-r border-gray-300 text-center align-middle cursor-pointer transition select-none ${
                                  canEdit
                                    ? 'hover:opacity-80 active:scale-95'
                                    : 'cursor-default'
                                }`}
                                title={`${emp.first_name}: วันที่ ${day.dayNum} (${currentShift?.shift_name || 'กะมาตรฐาน'}) - คลิกเพื่อเปลี่ยนกะ`}
                              >
                                <div
                                  className={`w-full h-8 flex items-center justify-center font-bold text-xs border-y ${badge.bg}`}
                                >
                                  {badge.code}
                                </div>
                              </td>
                            );
                          })}

                          {/* Summary Counters */}
                          <td className="py-2 px-1 text-center font-bold border-r border-gray-300 bg-red-50 text-red-700">
                            {countH}
                          </td>
                          <td className="py-2 px-1 text-center font-bold border-r border-gray-300 bg-yellow-50 text-yellow-800">
                            {countE}
                          </td>
                          <td className="py-2 px-1 text-center font-bold border-r border-gray-300 bg-green-50 text-green-800">
                            {countP}
                          </td>
                          <td className="py-2 px-1 text-center font-bold border-gray-300 bg-orange-50 text-orange-800">
                            {countL}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Shift Templates Management */}
        {activeTab === 'shifts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  รายการกะการทำงาน (Shift Templates)
                </h3>
                <p className="text-xs text-gray-500">
                  กำหนดช่วงเวลาเข้า-ออกงานที่ใช้ในการคำนวณการมาสายและการทำงาน
                </p>
              </div>

              {canManage && (
                <button
                  onClick={handleOpenCreateShift}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> สร้างกะใหม่
                </button>
              )}
            </div>

            {loadingShifts ? (
              <div className="py-12 text-center text-gray-400">
                กำลังโหลดรายการกะ...
              </div>
            ) : shifts.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100">
                ยังไม่มีกะการทำงานในระบบ
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-indigo-200 transition relative"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">
                          {shift.shift_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 text-indigo-600 font-mono text-lg font-bold">
                          <Clock className="w-5 h-5 text-indigo-500" />
                          {formatTime(shift.start_time)} -{' '}
                          {formatTime(shift.end_time)} น.
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenEditShift(shift)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition"
                            title="แก้ไขกะ"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `คุณต้องการลบกะ "${shift.shift_name}" หรือไม่?`,
                                )
                              ) {
                                deleteShiftMutation.mutate(shift.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="ลบกะ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>เกณฑ์เข้างานสาย</span>
                      <span className="font-semibold text-rose-600">
                        หลัง {formatTime(shift.start_time)} น.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal: Interactive Cell Click to Assign Shift for Specific Date */}
        {cellModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
              <button
                onClick={closeCellModal}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  เลือกกะการทำงานรายวัน
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  วันที่ {cellModal.dayNum} {monthTitle} {thaiBuddhistYear}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  พนักงาน:{' '}
                  <b className="text-gray-800">
                    {cellModal.employee?.first_name}{' '}
                    {cellModal.employee?.last_name}
                  </b>{' '}
                  ({cellModal.employee?.department || '-'})
                </p>
              </div>

              <form onSubmit={handleSaveCellAssignment} className="space-y-4">
                {/* Switcher: Preset Shift vs Custom Time */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('preset')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      assignmentMode === 'preset'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    เลือกกะที่มีอยู่
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('custom')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      assignmentMode === 'custom'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    ⏰ กำหนดเวลาเอง
                  </button>
                </div>

                {/* Option 1: Preset Shifts */}
                {assignmentMode === 'preset' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {shifts.map((s) => {
                      const badge = getShiftBadge(s);
                      const isSelected = selectedShiftId === s.id;
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="selectedShift"
                              value={s.id}
                              checked={isSelected}
                              onChange={() => setSelectedShiftId(s.id)}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${badge.bg}`}
                              >
                                {badge.code}
                              </span>
                              <div>
                                <span className="block text-sm leading-tight">
                                  {s.shift_name}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  {formatTime(s.start_time)} -{' '}
                                  {formatTime(s.end_time)} น.
                                </span>
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-indigo-600" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Option 2: Custom Time */}
                {assignmentMode === 'custom' && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        ชื่อกะ / หมายเหตุเวลา
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น กะพิเศษ, สลับเวร"
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={customShiftForm.shift_name}
                        onChange={(e) =>
                          setCustomShiftForm({
                            ...customShiftForm,
                            shift_name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          เวลาเริ่มงาน <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="time"
                          required={assignmentMode === 'custom'}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold text-indigo-950"
                          value={customShiftForm.start_time}
                          onChange={(e) =>
                            setCustomShiftForm({
                              ...customShiftForm,
                              start_time: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          เวลาเลิกงาน <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="time"
                          required={assignmentMode === 'custom'}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold text-indigo-950"
                          value={customShiftForm.end_time}
                          onChange={(e) =>
                            setCustomShiftForm({
                              ...customShiftForm,
                              end_time: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeCellModal}
                    className="px-4 py-2 text-xs sm:text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={assignMutation.isPending}
                    className="px-5 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition"
                  >
                    {assignMutation.isPending
                      ? 'กำลังบันทึก...'
                      : 'บันทึกกะวันนี้'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Shift Template (Admin) */}
        {isShiftModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                {editingShift ? 'แก้ไขกะการทำงาน' : 'สร้างกะการทำงานใหม่'}
              </h3>

              <form onSubmit={handleSaveShift} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อกะการทำงาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น กะเช้า, กะบ่าย, กะดึก, วันหยุด (H)"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={shiftForm.shift_name}
                    onChange={(e) =>
                      setShiftForm({ ...shiftForm, shift_name: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เวลาเริ่มงาน <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      value={shiftForm.start_time}
                      onChange={(e) =>
                        setShiftForm({
                          ...shiftForm,
                          start_time: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เวลาเลิกงาน <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      value={shiftForm.end_time}
                      onChange={(e) =>
                        setShiftForm({ ...shiftForm, end_time: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsShiftModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createShiftMutation.isPending ||
                      updateShiftMutation.isPending
                    }
                    className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition"
                  >
                    บันทึกกะ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
