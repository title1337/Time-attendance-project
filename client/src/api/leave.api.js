import axiosInstance from './axiosConfig';

export const leaveApi = {
  createRequest: async (data) => {
    const response = await axiosInstance.post('/leave/request', data);
    return response.data;
  },

  updateRequest: async ({ id, ...data }) => {
    const response = await axiosInstance.put(`/leave/${id}`, data);
    return response.data;
  },

  deleteRequest: async (id) => {
    const response = await axiosInstance.delete(`/leave/${id}`);
    return response.data;
  },

  getMyHistory: async (params) => {
    const response = await axiosInstance.get('/leave/my-history', { params });
    return response.data;
  },

  getAllRequests: async (params) => {
    const response = await axiosInstance.get('/leave/all', { params });
    return response.data;
  },

  updateStatus: async ({ id, status }) => {
    const response = await axiosInstance.patch(`/leave/${id}/status`, {
      status,
    });
    return response.data;
  },
};
