import axiosInstance from './axiosConfig';

export const reportsApi = {
  attendance: async (params) => (await axiosInstance.get('/reports/attendance', { params })).data,
};
