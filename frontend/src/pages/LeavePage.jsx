import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  FileText,
  Send,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  Pencil,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import { leaveApi } from '../api/leave.api';
import useAuthStore from '../store/authStore';
import { useDebounce } from '../hooks/useDebounce';

const LEAVE_TYPES = [
  {
    value: 'vacation',
    label: 'ลาพักร้อน',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  {
    value: 'sick',
    label: 'ลาป่วย',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    value: 'personal',
    label: 'ลากิจ',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
];

export default function LeavePage() {
  const { user, isManager } = useAuthStore();
  const queryClient = useQueryClient();

  // Active view tab for managers: 'my' or 'manage'
  const [activeTab, setActiveTab] = useState('my');

  // Form State
  const [form, setForm] = useState({
    leaveType: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // id ของคำขอลาที่กำลังแก้ไข (null = โหมดสร้างใหม่)
  const [editingId, setEditingId] = useState(null);
  const formSectionRef = useRef(null);

  // Search & Filter State with Debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 450);

  // Queries
  const { data: myHistoryData, isLoading: loadingMy } = useQuery({
    queryKey: ['leave', 'my-history'],
    queryFn: () => leaveApi.getMyHistory(),
  });

  const { data: allRequestsData, isLoading: loadingAll } = useQuery({
    queryKey: ['leave', 'all', debouncedSearch, statusFilter],
    queryFn: () =>
      leaveApi.getAllRequests({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      }),
    enabled: isManager() && activeTab === 'manage',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: leaveApi.createRequest,
    onSuccess: () => {
      toast.success('ส่งคำขอลางานเรียบร้อยแล้ว');
      setForm({
        leaveType: 'vacation',
        startDate: '',
        endDate: '',
        reason: '',
      });
      queryClient.invalidateQueries({ queryKey: ['leave', 'my-history'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'ไม่สามารถส่งคำขอได้');
    },
  });

  const updateMutation = useMutation({
    mutationFn: leaveApi.updateRequest,
    onSuccess: () => {
      toast.success('แก้ไขคำขอลางานเรียบร้อยแล้ว');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['leave', 'my-history'] });
      queryClient.invalidateQueries({ queryKey: ['leave', 'all'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'ไม่สามารถแก้ไขคำขอได้');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: leaveApi.deleteRequest,
    onSuccess: (_data, deletedId) => {
      toast.success('ยกเลิกคำขอลางานเรียบร้อยแล้ว');
      const wasEditingDeletedItem = editingId === deletedId;
      if (wasEditingDeletedItem) {
        resetForm();
      }
      queryClient.invalidateQueries({ queryKey: ['leave', 'my-history'] });
      queryClient.invalidateQueries({ queryKey: ['leave', 'all'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'ไม่สามารถยกเลิกคำขอได้');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: leaveApi.updateStatus,
    onSuccess: () => {
      toast.success('อัปเดตสถานะสำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['leave', 'all'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปเดต');
    },
  });

  function resetForm() {
    setEditingId(null);
    setForm({ leaveType: 'vacation', startDate: '', endDate: '', reason: '' });
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      toast.error('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
      return;
    }

    createMutation.mutate(form);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      leaveType: item.leave_type,
      startDate: String(item.start_date).slice(0, 10),
      endDate: String(item.end_date).slice(0, 10),
      reason: item.reason || '',
    });
    formSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleDelete = (item) => {
    const isConfirmed = window.confirm('ต้องการยกเลิกคำขอลานี้ใช่หรือไม่?');
    if (!isConfirmed) {
      return;
    }
    deleteMutation.mutate(item.id);
  };

  // แก้ไข/ยกเลิกได้เฉพาะการลาที่ยังไม่สิ้นสุด (ตรงกับกฎฝั่ง backend)
  const todayText = format(new Date(), 'yyyy-MM-dd');
  const canModifyLeave = (item) => {
    const endDateText = String(item.end_date).slice(0, 10);
    return endDateText >= todayText;
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isEditing = editingId !== null;
  let submitLabel = 'ส่งคำขอลางาน';
  if (isEditing) {
    submitLabel = 'บันทึกการแก้ไข';
  }
  if (isSubmitting) {
    submitLabel = 'กำลังส่งข้อมูล...';
  }

  const myLeaves = myHistoryData?.data || [];
  const allLeaves = allRequestsData?.data || [];

  // Count Leave Statistics
  const annualCount = myLeaves.filter(
    (l) => l.leave_type === 'vacation' && l.status === 'approved',
  ).length;
  const sickCount = myLeaves.filter(
    (l) => l.leave_type === 'sick' && l.status === 'approved',
  ).length;
  const personalCount = myLeaves.filter(
    (l) => l.leave_type === 'personal' && l.status === 'approved',
  ).length;

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
              ระบบขอลาหยุดงาน
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              ส่งคำขอ อนุมัติ และติดตามสถานะการลางาน
            </p>
          </div>

          {isManager() && (
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
                <UserCheck className="w-4 h-4" /> จัดการคำขอพนักงาน
              </button>
            </div>
          )}
        </div>

        {activeTab === 'my' ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">
                  ลาพักร้อนที่ใช้ไป
                </p>
                <h2 className="text-3xl font-extrabold text-indigo-600 mt-2">
                  {annualCount}
                </h2>
                <p className="text-xs text-gray-400 mt-1">วัน (อนุมัติแล้ว)</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">
                  ลาป่วยที่ใช้ไป
                </p>
                <h2 className="text-3xl font-extrabold text-emerald-600 mt-2">
                  {sickCount}
                </h2>
                <p className="text-xs text-gray-400 mt-1">วัน (อนุมัติแล้ว)</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-500">
                  ลากิจที่ใช้ไป
                </p>
                <h2 className="text-3xl font-extrabold text-amber-600 mt-2">
                  {personalCount}
                </h2>
                <p className="text-xs text-gray-400 mt-1">วัน (อนุมัติแล้ว)</p>
              </div>
            </div>

            {/* Form */}
            <div
              ref={formSectionRef}
              className={`bg-white rounded-2xl shadow-sm border p-6 ${
                isEditing
                  ? 'border-indigo-400 ring-2 ring-indigo-500/20'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-lg text-gray-900">
                  {isEditing ? 'แก้ไขคำขอลางาน' : 'แบบฟอร์มขอลางาน'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทการลา
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {LEAVE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, leaveType: type.value })
                        }
                        className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition ${
                          form.leaveType === type.value
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      วันที่เริ่มลา
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        required
                        className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                        value={form.startDate}
                        onChange={(e) =>
                          setForm({ ...form, startDate: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      วันที่สิ้นสุด
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        required
                        className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                        value={form.endDate}
                        onChange={(e) =>
                          setForm({ ...form, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เหตุผลการลา
                  </label>
                  <textarea
                    rows="3"
                    required
                    placeholder="กรุณาระบุเหตุผลการลา..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    value={form.reason}
                    onChange={(e) =>
                      setForm({ ...form, reason: e.target.value })
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium px-6 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md shadow-indigo-100"
                  >
                    <Send className="w-4 h-4" />
                    {submitLabel}
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={isSubmitting}
                      className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-6 py-2.5 rounded-xl transition"
                    >
                      ยกเลิกการแก้ไข
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* My Leave History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-lg text-gray-900">
                  ประวัติการขอลาของฉัน
                </h2>
              </div>

              {loadingMy ? (
                <div className="py-8 text-center text-gray-400">
                  กำลังโหลดข้อมูล...
                </div>
              ) : myLeaves.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  ยังไม่มีประวัติการขอลางาน
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myLeaves.map((item) => (
                    <div
                      key={item.id}
                      className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            {LEAVE_TYPES.find(
                              (t) => t.value === item.leave_type,
                            )?.label || item.leave_type}
                          </span>
                          <span className="text-xs text-gray-400">
                            (ขอเมื่อ{' '}
                            {format(new Date(item.created_at), 'd MMM yyyy', {
                              locale: th,
                            })}
                            )
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          วันที่: {item.start_date} ถึง {item.end_date}
                        </p>
                        {item.reason && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            เหตุผล: {item.reason}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {renderStatusBadge(item.status)}

                        {canModifyLeave(item) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              disabled={deleteMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-medium transition"
                            >
                              <Pencil className="w-3.5 h-3.5" /> แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={deleteMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> ยกเลิก
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Manager / Admin Approval Tab with Debounced Search */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อพนักงาน หรือ รหัสพนักงาน (Debounce Search)..."
                  className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
            ) : allLeaves.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                ไม่พบรายการคำขอลางาน
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="py-3 px-4">พนักงาน</th>
                      <th className="py-3 px-4">ประเภท</th>
                      <th className="py-3 px-4">วันที่ลา</th>
                      <th className="py-3 px-4">เหตุผล</th>
                      <th className="py-3 px-4">สถานะ</th>
                      <th className="py-3 px-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allLeaves.map((item) => (
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
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-gray-800">
                            {LEAVE_TYPES.find(
                              (t) => t.value === item.leave_type,
                            )?.label || item.leave_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          {item.start_date} ~ {item.end_date}
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
