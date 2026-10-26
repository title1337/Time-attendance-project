import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Users,
  UserRound,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import useAuthStore from '../store/authStore';
import { usersApi } from '../api/users.api';

const roleNames = {
  employee: 'พนักงาน',
  manager: 'ผู้จัดการ',
  admin: 'ผู้ดูแลระบบ',
};

function UsersPage() {
  const [search, setSearch] = useState('');
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });
  const updateMutation = useMutation({
    mutationFn: usersApi.update,
    onSuccess: () => {
      toast.success('บันทึกข้อมูลผู้ใช้แล้ว');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || 'บันทึกไม่สำเร็จ'),
  });
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (data?.data ?? []).filter((item) =>
      `${item.first_name} ${item.last_name} ${item.employee_code} ${item.email} ${item.department ?? ''}`
        .toLocaleLowerCase()
        .includes(term),
    );
  }, [data, search]);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-600">ระบบบุคลากร</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              จัดการผู้ใช้
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              ค้นหา ปรับบทบาท และระงับบัญชีผู้ใช้
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาชื่อ รหัส หรืออีเมล"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-center gap-3">
            <span className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs text-gray-500">ผู้ใช้ทั้งหมด</p>
              <p className="text-xl font-bold text-gray-900">
                {data?.data?.length ?? '—'}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-center gap-3">
            <span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs text-gray-500">บัญชีที่ใช้งาน</p>
              <p className="text-xl font-bold text-gray-900">
                {data?.data?.filter((item) => item.is_active).length ?? '—'}
              </p>
            </div>
          </div>
        </div>
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">รายชื่อผู้ใช้</h2>
            <span className="text-xs text-gray-400">แสดงสูงสุด 500 รายการ</span>
          </div>
          {isLoading ? (
            <p className="p-10 text-center text-sm text-gray-500">
              กำลังโหลดข้อมูล...
            </p>
          ) : isError ? (
            <div className="p-10 text-center">
              <p className="text-sm text-rose-600">โหลดรายชื่อไม่สำเร็จ</p>
              <button
                onClick={() => refetch()}
                className="mt-3 text-sm font-medium text-indigo-600"
              >
                ลองอีกครั้ง
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-500">
              ไม่พบผู้ใช้
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                  <tr>
                    <th className="px-5 py-3">ผู้ใช้</th>
                    <th className="px-4 py-3">แผนก</th>
                    <th className="px-4 py-3">สิทธิ์</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-5 py-3 text-right">บัญชี</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((item) => {
                    const isSelf = item.id === user?.id;
                    const RoleIcon =
                      item.role === 'admin' ? ShieldCheck : UserRound;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">
                            {item.first_name} {item.last_name}
                            {isSelf && (
                              <span className="ml-2 text-xs font-normal text-indigo-600">
                                คุณ
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500">
                            {item.employee_code} · {item.email}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {item.department || '—'}
                        </td>
                        <td className="px-4 py-4">
                          <label className="flex items-center gap-2">
                            <RoleIcon className="h-4 w-4 text-indigo-500" />
                            <select
                              aria-label={`สิทธิ์ ${item.first_name}`}
                              value={item.role}
                              disabled={isSelf || updateMutation.isPending}
                              onChange={(event) =>
                                updateMutation.mutate({
                                  id: item.id,
                                  role: event.target.value,
                                })
                              }
                              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs disabled:bg-gray-50"
                            >
                              {Object.entries(roleNames).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                          >
                            {item.is_active ? 'ใช้งาน' : 'ระงับ'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            disabled={isSelf || updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({
                                id: item.id,
                                is_active: !item.is_active,
                              })
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${item.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                          >
                            {item.is_active ? (
                              <>
                                <UserX className="h-3.5 w-3.5" />
                                ระงับ
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                เปิดใช้
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}

export default UsersPage;
