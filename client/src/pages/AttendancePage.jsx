import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  Clock,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileSpreadsheet,
  Download,
  Pencil, // [เพิ่ม] ไอคอนปุ่มแก้ไข
  X, // [เพิ่ม] ไอคอนปิด modal
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { attendanceApi } from '../api/attendance.api';
import useAuthStore from '../store/authStore';
import { useDebounce } from '../hooks/useDebounce';

const STATUS_LABELS = Object.freeze({
  present: 'มาทำงาน',
  late: 'สาย',
  leave: 'ลาหยุด',
  absent: 'ขาดงาน',
});

export default function AttendancePage() {
  const { user } = useAuthStore();
  const today = new Date();
  const queryClient = useQueryClient(); // [เพิ่ม]

  const [selectedMonth, setSelectedMonth] = useState(
    String(today.getMonth() + 1),
  );
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);

  // [เพิ่ม] state สำหรับ modal แก้ไข
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    check_in_time: '',
    check_out_time: '',
    note: '',
  });

  // Query my attendance history
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['attendance', 'history', selectedMonth, selectedYear],
    queryFn: () =>
      attendanceApi.getMyHistory({
        month: selectedMonth,
        year: selectedYear,
        limit: 31,
      }),
  });

  // [เพิ่ม] mutation สำหรับบันทึกการแก้ไข
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => attendanceApi.updateRecord(id, payload),
    onSuccess: () => {
      toast.success('แก้ไขเวลาเรียบร้อยแล้ว');
      queryClient.invalidateQueries({ queryKey: ['attendance', 'history'] });
      setEditingRecord(null);
    },
    onError: (error) => {
      const serverMessage = error?.response?.data?.message;
      const fallbackMessage = 'ไม่สามารถแก้ไขเวลาได้';
      toast.error(serverMessage || fallbackMessage);
    },
  });

  const rawRecords = historyData?.data || [];

  // Client-side filter using debounced input
  const filteredRecords = rawRecords.filter((rec) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      rec.work_date?.includes(q) ||
      rec.status?.toLowerCase().includes(q) ||
      rec.note?.toLowerCase().includes(q)
    );
  });

  // [เพิ่ม] เปิด modal พร้อมใส่ค่าเดิมของรายการนั้น
  const handleOpenEdit = (rec) => {
    const checkIn = rec.check_in_time ? rec.check_in_time.slice(0, 5) : '';
    const checkOut = rec.check_out_time ? rec.check_out_time.slice(0, 5) : '';

    setEditForm({
      check_in_time: checkIn,
      check_out_time: checkOut,
      note: rec.note || '',
    });
    setEditingRecord(rec);
  };

  // [เพิ่ม] ตรวจข้อมูลแล้วส่งไปบันทึก
  const handleSubmitEdit = (e) => {
    e.preventDefault();

    const { check_in_time, check_out_time, note } = editForm;

    if (!check_in_time) {
      toast.error('กรุณากรอกเวลาเข้างาน');
      return;
    }

    const hasCheckOut = Boolean(check_out_time);

    if (hasCheckOut && check_out_time <= check_in_time) {
      toast.error('เวลาออกงานต้องมากกว่าเวลาเข้างาน');
      return;
    }

    const trimmedNote = note.trim();

    const payload = {
      check_in_time,
      check_out_time: hasCheckOut ? check_out_time : null,
      note: trimmedNote || null,
    };

    updateMutation.mutate({ id: editingRecord.id, payload });
  };

  /**
   * Export attendance records to Excel (.xlsx)
   */
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      toast.error('ไม่พบข้อมูลสำหรับ Export');
      return;
    }

    try {
      const exportData = filteredRecords.map((rec, index) => {
        let durationText = '-';
        if (rec.check_in_time && rec.check_out_time) {
          const [inH, inM] = rec.check_in_time.split(':').map(Number);
          const [outH, outM] = rec.check_out_time.split(':').map(Number);
          const totalMinutes = outH * 60 + outM - (inH * 60 + inM);
          if (totalMinutes > 0) {
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            durationText = `${h} ชม. ${m} นาที`;
          }
        }

        return {
          ลำดับ: index + 1,
          รหัสพนักงาน: user?.employee_code || '-',
          'ชื่อ-นามสกุล':
            `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          แผนก: user?.department || '-',
          วันที่ปฏิบัติงาน: rec.work_date,
          เวลาเข้างาน: rec.check_in_time ? rec.check_in_time.slice(0, 5) : '-',
          เวลาออกงาน: rec.check_out_time ? rec.check_out_time.slice(0, 5) : '-',
          ระยะเวลาทำงาน: durationText,
          สถานะ: STATUS_LABELS[rec.status] || rec.status || '-',
          หมายเหตุ: rec.note || '-',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'บันทึกการลงเวลา');

      // Auto column widths
      const colWidths = [
        { wch: 8 }, // ลำดับ
        { wch: 14 }, // รหัสพนักงาน
        { wch: 22 }, // ชื่อ-นามสกุล
        { wch: 16 }, // แผนก
        { wch: 16 }, // วันที่
        { wch: 14 }, // เวลาเข้า
        { wch: 14 }, // เวลาออก
        { wch: 18 }, // ระยะเวลา
        { wch: 14 }, // สถานะ
        { wch: 24 }, // หมายเหตุ
      ];
      worksheet['!cols'] = colWidths;

      const fileName = `Attendance_${user?.employee_code || 'export'}_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel');
    }
  };

  const renderStatus = (status) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> มาทำงาน
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5" /> สาย
          </span>
        );
      case 'leave':
        return (
          <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" /> ลาหยุด
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" /> ขาดงาน
          </span>
        );
    }
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              บันทึกการลงเวลาเข้า-ออกงาน
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              ตรวจสอบประวัติการลงเวลาและสถานะการทำงานรายเดือน
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export เป็น Excel</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="ค้นหาวันที่ หรือ สถานะ (Search)..."
              className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <select
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  เดือน {format(new Date(2026, i, 1), 'MMMM', { locale: th })}
                </option>
              ))}
            </select>

            <select
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900">ประวัติการลงเวลา</h2>
            </div>
            <span className="text-xs text-gray-500">
              พบ {filteredRecords.length} รายการ
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-gray-400">
              กำลังโหลดข้อมูลประวัติการลงเวลา...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              ไม่พบประวัติการลงเวลาในช่วงนี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                  <tr>
                    <th className="py-3 px-4">วันที่ปฏิบัติงาน</th>
                    <th className="py-3 px-4">เวลาเข้างาน</th>
                    <th className="py-3 px-4">เวลาออกงาน</th>
                    <th className="py-3 px-4">ชั่วโมงทำงาน</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4">หมายเหตุ</th>
                    {/* [เพิ่ม] หัวคอลัมน์จัดการ */}
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map((rec) => {
                    let durationText = '-';
                    if (rec.check_in_time && rec.check_out_time) {
                      const [inH, inM] = rec.check_in_time
                        .split(':')
                        .map(Number);
                      const [outH, outM] = rec.check_out_time
                        .split(':')
                        .map(Number);
                      const totalMinutes = outH * 60 + outM - (inH * 60 + inM);
                      if (totalMinutes > 0) {
                        const h = Math.floor(totalMinutes / 60);
                        const m = totalMinutes % 60;
                        durationText = `${h} ชม. ${m} นาที`;
                      }
                    }

                    return (
                      <tr key={rec.id} className="hover:bg-gray-50/60">
                        <td className="py-3.5 px-4 font-medium text-gray-900">
                          {rec.work_date}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 font-semibold">
                          {rec.check_in_time
                            ? rec.check_in_time.slice(0, 5)
                            : '--:--'}
                        </td>
                        <td className="py-3.5 px-4 text-rose-600 font-semibold">
                          {rec.check_out_time
                            ? rec.check_out_time.slice(0, 5)
                            : '--:--'}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          {durationText}
                        </td>
                        <td className="py-3.5 px-4">
                          {renderStatus(rec.status)}
                        </td>
                        <td className="py-3.5 px-4 text-gray-400 text-xs truncate max-w-xs">
                          {rec.note || '-'}
                        </td>
                        {/* [เพิ่ม] ปุ่มแก้ไข */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rec)}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            แก้ไข
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* [เพิ่ม] Modal แก้ไขเวลา */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmitEdit}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                แก้ไขเวลา {editingRecord.work_date}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-600">
                เวลาเข้างาน
                <input
                  type="time"
                  value={editForm.check_in_time}
                  onChange={(e) =>
                    setEditForm({ ...editForm, check_in_time: e.target.value })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </label>

              <label className="text-sm text-gray-600">
                เวลาออกงาน
                <input
                  type="time"
                  value={editForm.check_out_time}
                  onChange={(e) =>
                    setEditForm({ ...editForm, check_out_time: e.target.value })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </label>
            </div>

            <label className="block text-sm text-gray-600">
              หมายเหตุ (เหตุผลที่แก้ไข)
              <textarea
                rows={3}
                value={editForm.note}
                onChange={(e) =>
                  setEditForm({ ...editForm, note: e.target.value })
                }
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {updateMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </div>
      )}
    </MainLayout>
  );
}
