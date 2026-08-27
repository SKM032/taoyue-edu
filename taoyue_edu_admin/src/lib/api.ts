/** API请求封装 - 自动适配 { code, message, data } 统一响应格式 */
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('admin_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data;
    // 如果是统一格式 { code, message, data }，自动解包
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      if (body.code === 0) {
        return { ...response, data: body.data };
      } else {
        return Promise.reject({
          response: { status: body.code, data: { detail: body.message } },
          isBusinessError: true,
        });
      }
    }
    return response;
  },
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      // 登录失败/过期跳转到管理后台自己的登录页。
      // 部署在子路径 /admin/ 下，必须拼上 base，否则 window.location 原生跳转会
      // 跳到域名根路径 /login（PC 客户端登录页）。VITE_BASE 如 /admin/ → basename=/admin。
      const basePath = (import.meta.env.VITE_BASE || '/').replace(/\/+$/, '') || '';
      window.location.href = `${basePath}/login`;
    }
    return Promise.reject(err);
  }
);

export default api;

// ==================== 认证 ====================

export const authApi = {
  login: (phone: string, code: string) =>
    api.post('/auth/login', { phone, code }),
  getMe: () => api.get('/auth/me'),
};

export const adminAuthApi = {
  passwordLogin: (username: string, password: string) =>
    api.post('/auth/password-login', { username, password }),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
};

// ==================== 管理端API ====================

export const adminApi = {
  // 仪表盘
  getDashboard: (period = 'week') =>
    api.get('/admin/dashboard', { params: { period } }),

  // 课程管理
  getCourses: (params: Record<string, any>) =>
    api.get('/admin/courses', { params }),
  getCourseDetail: (id: number) =>
    api.get(`/courses/${id}`),
  createCourse: (data: Record<string, any>) =>
    api.post('/courses', data),
  updateCourse: (id: number, data: Record<string, any>) =>
    api.put(`/courses/${id}`, data),
  deleteCourse: (id: number) =>
    api.delete(`/courses/${id}`),
  permanentDeleteCourse: (id: number) =>
    api.delete(`/courses/${id}/permanent`),
  restoreCourse: (id: number) =>
    api.put(`/courses/${id}/restore`),
  publishCourse: (id: number, status: string) =>
    api.put(`/courses/${id}/publish`, { status }),
  reviewCourse: (id: number, status: string, reason?: string) =>
    api.put(`/courses/${id}/review`, { status, reason }),

  // 章节管理
  getChapters: (courseId: number) =>
    api.get(`/courses/${courseId}/chapters`),
  addChapter: (courseId: number, data: Record<string, any>) =>
    api.post(`/courses/${courseId}/chapters`, data),
  updateChapter: (id: number, data: Record<string, any>) =>
    api.put(`/courses/chapters/${id}`, data),
  deleteChapter: (id: number) =>
    api.delete(`/courses/chapters/${id}`),

  // 课时管理
  addLesson: (chapterId: number, data: Record<string, any>) =>
    api.post(`/courses/chapters/${chapterId}/lessons`, data),
  updateLesson: (id: number, data: Record<string, any>) =>
    api.put(`/courses/lessons/${id}`, data),
  deleteLesson: (id: number) =>
    api.delete(`/courses/lessons/${id}`),

  // 用户管理
  getUsers: (params: Record<string, any>) =>
    api.get('/admin/users', { params }),
  updateUserStatus: (id: number, status: string) =>
    api.put(`/admin/users/${id}/status`, { status }),

  // 订单管理
  getOrders: (params: Record<string, any>) =>
    api.get('/admin/orders', { params }),

  // 销售概览
  getSalesOverview: (period = 'month') =>
    api.get('/admin/sales/overview', { params: { period } }),

  // 交付监控
  getDeliveryStats: (courseId: number) =>
    api.get(`/admin/delivery/${courseId}`),

  // 分类管理
  getCategories: () => api.get('/courses/categories'),
  getAdminCategories: () => api.get('/admin/categories'),
  createCategory: (data: Record<string, any>) =>
    api.post('/admin/categories', data),
  updateCategory: (id: number, data: Record<string, any>) =>
    api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id: number) =>
    api.delete(`/admin/categories/${id}`),

  // 讲师管理（管理端）
  getTeachers: () => api.get('/admin/teachers'),
  getTeacherDetail: (id: number) => api.get(`/admin/teachers/${id}`),
  createTeacher: (data: Record<string, any>) =>
    api.post('/admin/teachers', data),
  updateTeacher: (id: number, data: Record<string, any>) =>
    api.put(`/admin/teachers/${id}`, data),
  deleteTeacher: (id: number) =>
    api.delete(`/admin/teachers/${id}`),

  // 上传
  // 关键：显式把 Content-Type 设为 undefined，清除实例默认的 application/json，
  // 让 axios/浏览器根据 FormData 自动生成带 boundary 的 multipart/form-data。
  // 若手动设置 multipart/form-data 或不清除 application/json，都会导致缺少 boundary，后端解析失败。
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/upload/image', formData, { headers: { 'Content-Type': undefined } });
  },
  uploadVideo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/upload/video', formData, { headers: { 'Content-Type': undefined } });
  },

  // 种子数据
  seedData: () => api.post('/admin/seed'),

  // 内容管理
  createLive: (data: Record<string, any>) =>
    api.post('/content/lives', data),

  // ==================== 轮播图管理 ====================
  getBanners: (position?: string) =>
    api.get('/content/admin/banners', { params: position ? { position } : {} }),
  createBanner: (data: Record<string, any>) =>
    api.post('/content/banners', data),
  updateBanner: (id: number, data: Record<string, any>) =>
    api.put(`/content/admin/banners/${id}`, data),
  deleteBanner: (id: number) =>
    api.delete(`/content/admin/banners/${id}`),
  toggleBanner: (id: number) =>
    api.put(`/content/admin/banners/${id}/toggle`),
};
