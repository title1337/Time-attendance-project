import { Calendar, Clock, FileText, Send } from 'lucide-react';
import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';

export default function LeavePage() {
  const [form, setForm] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(form);

    alert('ส่งคำขอลางานเรียบร้อย');
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ลาหยุด</h1>
          <p className="text-gray-500 mt-1">ส่งคำขอลางานและติดตามสถานะ</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">ลาพักร้อนคงเหลือ</p>
            <h2 className="text-3xl font-bold text-indigo-600 mt-2"></h2>
            <p className="text-xs text-gray-400 mt-1">วัน</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">ลาป่วย</p>
            <h2 className="text-3xl font-bold text-green-600 mt-2"></h2>
            <p className="text-xs text-gray-400 mt-1">วัน</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">ลากิจ</p>
            <h2 className="text-3xl font-bold text-orange-600 mt-2"></h2>
            <p className="text-xs text-gray-400 mt-1">วัน</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">แบบฟอร์มขอลา</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                ประเภทการลา
              </label>

              <select
                className="w-full border rounded-lg px-3 py-2"
                value={form.leaveType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    leaveType: e.target.value,
                  })
                }
              >
                <option value="annual">ลาพักร้อน</option>
                <option value="sick">ลาป่วย</option>
                <option value="personal">ลากิจ</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  วันที่เริ่มลา
                </label>

                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />

                  <input
                    type="date"
                    className="w-full border rounded-lg pl-10 pr-3 py-2"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  วันที่สิ้นสุด
                </label>

                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />

                  <input
                    type="date"
                    className="w-full border rounded-lg pl-10 pr-3 py-2"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        endDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                เหตุผลการลา
              </label>

              <textarea
                rows="4"
                className="w-full border rounded-lg px-3 py-2"
                placeholder="กรุณาระบุเหตุผล"
                value={form.reason}
                onChange={(e) =>
                  setForm({
                    ...form,
                    reason: e.target.value,
                  })
                }
              />
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition"
            >
              <Send className="w-4 h-4" />
              ส่งคำขอลา
            </button>
          </form>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">ประวัติการลา</h2>
          </div>

          <div className="space-y-3">
            <div className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium"></p>
                <p className="text-sm text-gray-500"></p>
              </div>

              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm"></span>
            </div>

            <div className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium"></p>
                <p className="text-sm text-gray-500"></p>
              </div>

              <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm"></span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
