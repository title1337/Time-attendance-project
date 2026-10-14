import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Download, Search, ClipboardList } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import { reportsApi } from '../api/reports.api';

const today = new Date();
const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const firstDay = dateValue(new Date(today.getFullYear(), today.getMonth(), 1));
const todayValue = dateValue(today);

function ReportsPage() {
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(todayValue);
  const [search, setSearch] = useState('');
  const validRange = startDate && endDate && startDate <= endDate;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'attendance', startDate, endDate],
    queryFn: () => reportsApi.attendance({ startDate, endDate }),
    enabled: Boolean(validRange),
  });
  const rows = data?.data ?? [];
  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return rows.filter((row) => `${row.users?.first_name ?? ''} ${row.users?.last_name ?? ''} ${row.users?.employee_code ?? ''} ${row.users?.department ?? ''}`.toLocaleLowerCase().includes(term));
  }, [rows, search]);
  const exportReport = () => {
    if (!filteredRows.length) return toast.error('ไม่มีข้อมูลสำหรับส่งออก');
    const sheetRows = filteredRows.map((row) => ({
      วันที่: row.work_date,
      รหัสพนักงาน: row.users?.employee_code ?? '',
      ชื่อ: `${row.users?.first_name ?? ''} ${row.users?.last_name ?? ''}`.trim(),
      แผนก: row.users?.department ?? '',
      เข้างาน: row.check_in_time ?? '',
      ออกงาน: row.check_out_time ?? '',
      สถานะ: row.status ?? '',
      หมายเหตุ: row.note ?? '',
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheetRows), 'รายงานเวลา');
    XLSX.writeFile(workbook, `attendance-${startDate}-${endDate}.xlsx`);
  };
  const presentCount = rows.filter((row) => row.status === 'present').length;
  const lateCount = rows.filter((row) => row.status === 'late').length;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-indigo-600">สรุปการทำงาน</p><h1 className="mt-1 text-2xl font-bold text-gray-900">รายงาน</h1><p className="mt-1 text-sm text-gray-500">ตรวจสอบและส่งออกรายงานเวลาเข้างาน</p></div>
          <button onClick={exportReport} disabled={!filteredRows.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />ส่งออก Excel</button>
        </div>
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.5fr] sm:items-end">
            <label className="text-xs font-medium text-gray-600">ตั้งแต่<input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500" /></label>
            <label className="text-xs font-medium text-gray-600">ถึงวันที่<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500" /></label>
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อ รหัส หรือแผนก" className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          </div>
          {!validRange && <p className="mt-3 text-sm text-rose-600">กรุณาเลือกช่วงวันที่ให้ถูกต้อง</p>}
        </section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-gray-500"><ClipboardList className="h-4 w-4" /><span className="text-xs">รายการเข้างาน</span></div><p className="mt-2 text-2xl font-bold text-gray-900">{isLoading ? '…' : rows.length}</p></div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-emerald-600"><CalendarDays className="h-4 w-4" /><span className="text-xs">มาปฏิบัติงาน</span></div><p className="mt-2 text-2xl font-bold text-gray-900">{isLoading ? '…' : presentCount}</p></div>
          <div className="col-span-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:col-span-1"><div className="flex items-center gap-2 text-amber-600"><CalendarDays className="h-4 w-4" /><span className="text-xs">มาสาย</span></div><p className="mt-2 text-2xl font-bold text-gray-900">{isLoading ? '…' : lateCount}</p></div>
        </div>
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between"><h2 className="font-semibold text-gray-900">รายละเอียดเวลาเข้างาน</h2><span className="text-xs text-gray-400">สูงสุด 1,000 รายการ</span></div>
          {isLoading ? <p className="p-10 text-center text-sm text-gray-500">กำลังโหลดรายงาน...</p> : isError ? <div className="p-10 text-center"><p className="text-sm text-rose-600">โหลดรายงานไม่สำเร็จ</p><button onClick={() => refetch()} className="mt-3 text-sm font-medium text-indigo-600">ลองอีกครั้ง</button></div> : filteredRows.length === 0 ? <p className="p-10 text-center text-sm text-gray-500">ไม่พบข้อมูลในช่วงวันที่ที่เลือก</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50 text-xs font-semibold text-gray-500"><tr><th className="px-5 py-3">วันที่</th><th className="px-4 py-3">พนักงาน</th><th className="px-4 py-3">แผนก</th><th className="px-4 py-3">เข้างาน</th><th className="px-4 py-3">ออกงาน</th><th className="px-5 py-3">สถานะ</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredRows.map((row) => <tr key={row.id} className="hover:bg-gray-50/70"><td className="px-5 py-3.5 text-gray-700">{row.work_date}</td><td className="px-4 py-3.5"><div className="font-medium text-gray-900">{row.users?.first_name} {row.users?.last_name}</div><div className="text-xs text-gray-500">{row.users?.employee_code}</div></td><td className="px-4 py-3.5 text-gray-600">{row.users?.department || '—'}</td><td className="px-4 py-3.5 text-gray-700">{row.check_in_time?.slice(0, 5) || '—'}</td><td className="px-4 py-3.5 text-gray-700">{row.check_out_time?.slice(0, 5) || '—'}</td><td className="px-5 py-3.5"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{row.status || '—'}</span></td></tr>)}</tbody></table></div>
          )}
          {data?.meta?.returned === 1000 && <p className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-800">แสดง 1,000 รายการล่าสุด กรุณาลดช่วงวันที่เพื่อดูผลครบถ้วน</p>}
        </section>
      </div>
    </MainLayout>
  );
}

export default ReportsPage;
