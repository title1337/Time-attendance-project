import axiosInstance from './axiosConfig';

export const attendanceApi = {
  checkIn: async (data) => {
    const response = await axiosInstance.post('/attendance/checkin', data);
    return response.data;
  },

  checkOut: async (data) => {
    const response = await axiosInstance.post('/attendance/checkout', data);
    return response.data;
  },

  getTodayStatus: async () => {
    const response = await axiosInstance.get('/attendance/today');
    return response.data;
  },

  getMyHistory: async (params) => {
    const response = await axiosInstance.get('/attendance/my-history', {
      params,
    });
    return response.data;
  },

  getAll: async (params) => {
    const response = await axiosInstance.get('/attendance', { params });
    return response.data;
  },

  updateRecord: async (id, payload) => {
    const response = await axiosInstance.patch(`/attendance/${id}`, payload);
    return response.data;
  },
};
