import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Clock,
  Calendar,
  Send,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import { overtimeApi } from '../api/overtime.api';
import useAuthStore from '../store/authStore';
import { useDebounce } from '../hooks/useDebounce';

export default function OvertimePage() {
  const { user, isAdmin } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('my');

  // Form State
  const [form, setForm] = useState({
    workDate: new Date().toISOString().split('T')[0],
    startTime: '17:30',
    endTime: '20:30',
    reason: '',
  });

  // Debounced search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);

  // Queries
  const { data: myHistoryData, isLoading: loadingMy } = useQuery({
    queryKey: ['overtime', 'my-history'],
    queryFn: () => overtimeApi.getMyHistory(),
  });

  const { data: allRequestsData, isLoading: loadingAll } = useQuery({
    queryKey: ['overtime', 'all', debouncedSearch, statusFilter],
    queryFn: () =>
      overtimeApi.getAllRequests({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      }),
    enabled: isAdmin() && activeTab === 'manage',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: overtimeApi.createRequest,
    onSuccess: () => {
      toast.success('ส่งคำขอทำงานล่วงเวลาเรียบร้อยแล้ว');
      setForm({
        workDate: new Date().toISOString().split('T')[0],
        startTime: '17:30',
        endTime: '20:30',
        reason: '',
      });
      queryClient.invalidateQueries({ queryKey: ['overtime', 'my-history'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'ไม่สามารถส่งคำขอ OT ได้');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: overtimeApi.updateStatus,
    onSuccess: () => {
      toast.success('อัปเดตสถานะ OT สำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['overtime', 'all'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'ไม่สามารถอัปเดตสถานะได้');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.startTime >= form.endTime) {
      toast.error('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
      return;
    }
    createMutation.mutate(form);
  };

  const myOTList = myHistoryData?.data || [];
  const allOTList = allRequestsData?.data || [];

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5" /> รอการอนุมัติ
          </span>
        );
    }
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ขอทำงานล่วงเวลา (OT)
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              ยื่นคำขอ OT และตรวจสอบสถานะการอนุมัติ
            </p>
          </div>

          {isAdmin() && (
            <div className="flex bg-gray-200/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('my')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'my'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                คำขอของฉัน
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'manage'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCheck className="w-4 h-4" /> จัดการ OT พนักงาน
              </button>
            </div>
          )}
        </div>

        {activeTab === 'my' ? (
          <>
            {/* Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-lg text-gray-900">
                  แบบฟอร์มขอทำล่วงเวลา
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    วันที่ปฏิบัติงาน OT
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      required
                      className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={form.workDate}
                      onChange={(e) =>
                        setForm({ ...form, workDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เวลาเริ่มต้น
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        required
                        className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        value={form.startTime}
                        onChange={(e) =>
                          setForm({ ...form, startTime: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เวลาสิ้นสุด
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        required
                        className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        value={form.endTime}
                        onChange={(e) =>
                          setForm({ ...form, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รายละเอียดงานที่ทำ
                  </label>
                  <textarea
                    rows="3"
                    required
                    placeholder="ระบุรายละเอียดงานหรือภารกิจช่วงล่วงเวลา..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={form.reason}
                    onChange={(e) =>
                      setForm({ ...form, reason: e.target.value })
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium px-6 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md shadow-indigo-100"
                >
                  <Send className="w-4 h-4" />
                  {createMutation.isPending
                    ? 'กำลังส่งข้อมูล...'
                    : 'ส่งคำขอ OT'}
                </button>
              </form>
            </div>

            {/* My OT History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-lg text-gray-900">
                  ประวัติการขอ OT ของฉัน
                </h2>
              </div>

              {loadingMy ? (
                <div className="py-8 text-center text-gray-400">
                  กำลังโหลดข้อมูล...
                </div>
              ) : myOTList.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  ยังไม่มีประวัติการขอ OT
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myOTList.map((item) => (
                    <div
                      key={item.id}
                      className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            วันที่: {item.work_date}
                          </span>
                          <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full">
                            {item.start_time} - {item.end_time}
                          </span>
                        </div>
                        {item.reason && (
                          <p className="text-sm text-gray-600 mt-1">
                            รายละเอียด: {item.reason}
                          </p>
                        )}
                      </div>

                      <div>{renderStatusBadge(item.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Manager / Admin OT Management */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อพนักงาน หรือ รหัสพนักงาน (Debounce Search)..."
                  className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">ทุกสถานะ</option>
                  <option value="pending">รอการอนุมัติ</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="rejected">ไม่อนุมัติ</option>
                </select>
              </div>
            </div>

            {loadingAll ? (
              <div className="py-12 text-center text-gray-400">
                กำลังค้นหาข้อมูล...
              </div>
            ) : allOTList.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                ไม่พบคำขอ OT
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="py-3 px-4">พนักงาน</th>
                      <th className="py-3 px-4">วันที่ปฏิบัติงาน</th>
                      <th className="py-3 px-4">ช่วงเวลา</th>
                      <th className="py-3 px-4">รายละเอียดงาน</th>
                      <th className="py-3 px-4">สถานะ</th>
                      <th className="py-3 px-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allOTList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/60">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-900">
                            {item.users?.first_name} {item.users?.last_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.users?.employee_code} •{' '}
                            {item.users?.department}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-gray-800">
                          {item.work_date}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          {item.start_time} - {item.end_time}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">
                          {item.reason || '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(item.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {item.status === 'pending' ? (
                            <>
                              <button
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: item.id,
                                    status: 'approved',
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"
                              >
                                อนุมัติ
                              </button>
                              <button
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: item.id,
                                    status: 'rejected',
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition"
                              >
                                ปฏิเสธ
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">
                              ดำเนินการแล้ว
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
