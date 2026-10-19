import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle,
  Save,
  X,
  Search,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import { scheduleApi } from '../api/schedule.api';
import useAuthStore from '../store/authStore';
import { useDebounce } from '../hooks/useDebounce';

function formatTime(str) {
  if (!str) return '--:--';
  return str.slice(0, 5);
}

export default function SchedulePage() {
  const { user, isAdmin } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'shifts'
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Modal states for creating/editing shift template
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    shift_name: '',
    start_time: '08:30',
    end_time: '17:30',
  });

  // Modal state for assigning shift to employee
  const [assignModalUser, setAssignModalUser] = useState(null);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  // Queries
  const { data: shiftsData, isLoading: loadingShifts } = useQuery({
    queryKey: ['schedules', 'shifts'],
    queryFn: scheduleApi.getAllShifts,
  });

  const { data: userShiftsData, isLoading: loadingUserShifts } = useQuery({
    queryKey: ['schedules', 'user-shifts'],
    queryFn: scheduleApi.getAllUserShifts,
  });

  const { data: myShiftData } = useQuery({
    queryKey: ['schedule', 'my-shift'],
    queryFn: scheduleApi.getMyCurrentShift,
  });

  // Shift Template Mutations
  const createShiftMutation = useMutation({
    mutationFn: scheduleApi.createShift,
    onSuccess: () => {
      toast.success('สร้างกะการทำงานเรียบร้อย');
      setIsShiftModalOpen(false);
      resetShiftForm();
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'),
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => scheduleApi.updateShift(id, data),
    onSuccess: () => {
      toast.success('อัปเดตกะการทำงานเรียบร้อย');
      setIsShiftModalOpen(false);
      resetShiftForm();
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: scheduleApi.deleteShift,
    onSuccess: () => {
      toast.success('ลบกะการทำงานสำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'ไม่สามารถลบกะนี้ได้'),
  });

  // Assignment Mutation (Works for both employee self-assign and admin assigning anyone)
  const assignMutation = useMutation({
    mutationFn: scheduleApi.assignShift,
    onSuccess: () => {
      toast.success('บันทึกตารางกะการทำงานเรียบร้อย');
      setAssignModalUser(null);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', 'my-shift'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด'),
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

  const handleOpenAssignModal = (employee) => {
    setAssignModalUser(employee);
    setSelectedShiftId(employee.shift_id || shiftsData?.data?.[0]?.id || '');
    setEffectiveDate(employee.effective_date || new Date().toISOString().split('T')[0]);
  };

  const handleSaveAssignment = (e) => {
    e.preventDefault();
    if (!selectedShiftId) {
      toast.error('กรุณาเลือกกะการทำงาน');
      return;
    }
    assignMutation.mutate({
      user_id: assignModalUser.id,
      shift_id: selectedShiftId,
      effective_date: effectiveDate,
    });
  };

  const shifts = shiftsData?.data || [];
  const allUsers = userShiftsData?.data || [];
  const myCurrentShift = myShiftData?.data?.shift;

  // Filter roster by employee code or name
  const filteredUsers = allUsers.filter((u) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const empCode = (u.employee_code || '').toLowerCase();
    const dept = (u.department || '').toLowerCase();
    return fullName.includes(q) || empCode.includes(q) || dept.includes(q);
  });

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-7 h-7 text-indigo-600" />
              ตารางและการจัดการกะการทำงาน
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              สร้าง แก้ไข และมอบหมายกะการทำงานสำหรับพนักงานและผู้ดูแลระบบ
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex bg-gray-200/80 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'roster'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" /> ตารางกะพนักงาน
            </button>
            <button
              onClick={() => setActiveTab('shifts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'shifts'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4" /> จัดการกะ (Shifts)
            </button>
          </div>
        </div>

        {/* My Current Shift Banner (Employee view) */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                กะการทำงานของคุณ ({user?.first_name} {user?.last_name})
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-0.5">
                {myCurrentShift?.shift_name || 'กะเวลามาตรฐาน'}
              </h2>
              <p className="text-sm text-gray-600">
                เวลาเข้า-ออกงาน:{' '}
                <span className="font-bold text-indigo-700">
                  {formatTime(myCurrentShift?.start_time)} - {formatTime(myCurrentShift?.end_time)} น.
                </span>{' '}
                (ลงเวลาหลัง {formatTime(myCurrentShift?.start_time)} น. จะถือว่าสาย)
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenAssignModal(user)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition shrink-0"
          >
            เลือก/เปลี่ยนกะของฉัน
          </button>
        </div>

        {/* Tab 1: Roster / User Shift Assignments */}
        {activeTab === 'roster' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัสพนักงาน หรือ แผนก..."
                  className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <span className="text-xs text-gray-500 self-center sm:self-auto">
                พนักงานทั้งหมด {filteredUsers.length} คน
              </span>
            </div>

            {loadingUserShifts ? (
              <div className="py-12 text-center text-gray-400">กำลังโหลดตารางการทำงาน...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-gray-400">ไม่พบข้อมูลพนักงาน</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="py-3 px-4">พนักงาน</th>
                      <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                      <th className="py-3 px-4">กะการทำงานปัจจุบัน</th>
                      <th className="py-3 px-4">เวลาทำงาน</th>
                      <th className="py-3 px-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((emp) => {
                      const isMe = emp.id === user?.id;
                      const shift = emp.shift;
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {emp.first_name?.[0]}{emp.last_name?.[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {emp.first_name} {emp.last_name}
                                  {isMe && (
                                    <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                      ฉัน
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400">{emp.employee_code || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600">
                            <div>{emp.department || '-'}</div>
                            <div className="text-xs text-gray-400">{emp.position || '-'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {shift ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Clock className="w-3.5 h-3.5" />
                                {shift.shift_name}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">ยังไม่กำหนด (ใช้กะมาตรฐาน)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-700">
                            {shift ? (
                              <span>
                                {formatTime(shift.start_time)} - {formatTime(shift.end_time)} น.
                              </span>
                            ) : (
                              <span>08:30 - 17:30 น.</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {(isAdmin() || isMe) ? (
                              <button
                                onClick={() => handleOpenAssignModal(emp)}
                                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                              >
                                {isMe && !isAdmin() ? 'เปลี่ยนกะของฉัน' : 'กำหนดกะ'}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
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
                <h3 className="font-bold text-gray-900 text-lg">รายการกะการทำงาน (Shift Templates)</h3>
                <p className="text-xs text-gray-500">
                  กำหนดช่วงเวลาเข้า-ออกงานที่ใช้ในการคำนวณการมาสายและการทำงาน
                </p>
              </div>

              {isAdmin() && (
                <button
                  onClick={handleOpenCreateShift}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> สร้างกะใหม่
                </button>
              )}
            </div>

            {loadingShifts ? (
              <div className="py-12 text-center text-gray-400">กำลังโหลดรายการกะ...</div>
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
                        <h4 className="font-bold text-gray-900 text-base">{shift.shift_name}</h4>
                        <div className="flex items-center gap-2 mt-2 text-indigo-600 font-mono text-lg font-bold">
                          <Clock className="w-5 h-5 text-indigo-500" />
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)} น.
                        </div>
                      </div>
                      {isAdmin() && (
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
                              if (confirm(`คุณต้องการลบกะ "${shift.shift_name}" หรือไม่?`)) {
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

        {/* Modal 1: Create / Edit Shift Template */}
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
                    placeholder="เช่น กะเช้า, กะบ่าย, กะพิเศษ"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={shiftForm.shift_name}
                    onChange={(e) => setShiftForm({ ...shiftForm, shift_name: e.target.value })}
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
                      onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
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
                      onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  ⚠️ พนักงานที่ลงเวลาเข้างานหลังเวลาเริ่มงานที่กำหนด จะถูกบันทึกสถานะเป็น <b>"สาย"</b> อัตโนมัติ
                </p>

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
                    disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                    className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition"
                  >
                    บันทึกกะ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Assign Shift to User */}
        {assignModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
              <button
                onClick={() => setAssignModalUser(null)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                กำหนดกะการทำงาน
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                สำหรับ: <b className="text-gray-800">{assignModalUser.first_name} {assignModalUser.last_name}</b> ({assignModalUser.employee_code || '-'})
              </p>

              <form onSubmit={handleSaveAssignment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เลือกกะการทำงาน <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {shifts.map((s) => (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${
                          selectedShiftId === s.id
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="selectedShift"
                            value={s.id}
                            checked={selectedShiftId === s.id}
                            onChange={() => setSelectedShiftId(s.id)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="font-semibold block text-sm">{s.shift_name}</span>
                            <span className="text-xs text-gray-500 font-mono">
                              {formatTime(s.start_time)} - {formatTime(s.end_time)} น.
                            </span>
                          </div>
                        </div>
                        {selectedShiftId === s.id && (
                          <CheckCircle className="w-5 h-5 text-indigo-600" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    มีผลตั้งแต่วันที่
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setAssignModalUser(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={assignMutation.isPending}
                    className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition"
                  >
                    {assignMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกตารางกะ'}
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
