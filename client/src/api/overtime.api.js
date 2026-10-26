import axiosInstance from './axiosConfig';

export const overtimeApi = {
  createRequest: async (data) => {
    const response = await axiosInstance.post('/overtime/request', data);
    return response.data;
  },

  getMyHistory: async (params) => {
    const response = await axiosInstance.get('/overtime/my-history', { params });
    return response.data;
  },

  getAllRequests: async (params) => {
    const response = await axiosInstance.get('/overtime/all', { params });
    return response.data;
  },

  updateStatus: async ({ id, status }) => {
    const response = await axiosInstance.patch(`/overtime/${id}/status`, { status });
    return response.data;
  },
};
