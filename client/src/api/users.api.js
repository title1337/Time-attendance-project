import axiosInstance from './axiosConfig';

export const usersApi = {
  list: async () => (await axiosInstance.get('/users')).data,
  update: async ({ id, ...data }) => (await axiosInstance.patch(`/users/${id}`, data)).data,
};
