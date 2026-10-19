import axiosInstance from './axiosConfig';

export const scheduleApi = {
  // Get all shift templates
  getAllShifts: async () => {
    const response = await axiosInstance.get('/schedules/shifts');
    return response.data;
  },

  // Create shift template (Admin only)
  createShift: async (shiftData) => {
    const response = await axiosInstance.post('/schedules/shifts', shiftData);
    return response.data;
  },

  // Update shift template (Admin only)
  updateShift: async (id, shiftData) => {
    const response = await axiosInstance.put(`/schedules/shifts/${id}`, shiftData);
    return response.data;
  },

  // Delete shift template (Admin only)
  deleteShift: async (id) => {
    const response = await axiosInstance.delete(`/schedules/shifts/${id}`);
    return response.data;
  },

  // Get current assigned shift for logged-in user
  getMyCurrentShift: async () => {
    const response = await axiosInstance.get('/schedules/my-shift');
    return response.data;
  },

  // Get all user schedule assignments
  getAllUserShifts: async () => {
    const response = await axiosInstance.get('/schedules/user-shifts');
    return response.data;
  },

  // Assign or update shift for user (supports pre-set shifts or custom time)
  assignShift: async (payload) => {
    const response = await axiosInstance.post('/schedules/assign', payload);
    return response.data;
  },
};
