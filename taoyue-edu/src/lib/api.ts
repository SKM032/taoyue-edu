/** API 请求封装 - 自动适配 { code, message, data } 统一响应格式 */
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：自动添加Token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 响应拦截器：自动解包 { code, message, data } → 返回 data
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data;
    // 如果是统一格式 { code, message, data }，自动解包
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      if (body.code === 0) {
        // 成功：返回 data
        return { ...response, data: body.data };
      } else {
        // 业务错误：抛出异常
        return Promise.reject({
          response: {
            status: body.code,
            data: { detail: body.message },
          },
          isBusinessError: true,
        });
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
          const rawData = res.data;
          // 处理统一格式解包
          const payload = (rawData && typeof rawData === 'object' && 'data' in rawData) ? rawData.data : rawData;
          const { access_token, refresh_token } = payload || {};
          if (access_token) {
            localStorage.setItem('access_token', access_token);
            if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
          }
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${access_token}`;
            return api(error.config);
          }
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ==================== 认证 ====================

export const authApi = {
  // 图形验证码（防爬虫）
  getCaptcha: () => api.get('/auth/captcha', { responseType: 'blob' }),
  sendSms: (phone: string, type: string, captchaId?: string, captchaText?: string) =>
    api.post('/auth/send-sms', { phone, type, captcha_id: captchaId, captcha_text: captchaText }),
  // 短信登录/注册
  login: (phone: string, code: string) =>
    api.post('/auth/login', { phone, code }),
  register: (phone: string, code: string, nickname: string) =>
    api.post('/auth/register', { phone, code, nickname }),
  // 账号密码
  passwordRegister: (username: string, password: string) =>
    api.post('/auth/password-register', { username, password }),
  passwordLogin: (username: string, password: string) =>
    api.post('/auth/password-login/client', { username, password }),
  getMe: () => api.get('/auth/me'),
};

// ==================== 课程 ====================

export const courseApi = {
  getCategories: () => api.get('/courses/categories'),
  getTeachers: () => api.get('/courses/teachers'),
  getTeacher: (id: number) => api.get(`/courses/teachers/${id}`),
  getList: (params: Record<string, any>) => api.get('/courses', { params }),
  getDetail: (slug: string | number) => api.get(`/courses/${slug}`),
  getReviews: (courseId: number, page = 1) =>
    api.get(`/courses/${courseId}/reviews`, { params: { page } }),
  getResources: () => api.get('/courses/resources'),
};

// ==================== 订单 ====================

export const orderApi = {
  create: (data: { course_id: number; package_id?: number; pay_method: string; return_url: string; trade_type?: string }) =>
    api.post('/orders', data),
  // 多课程合并成一个订单
  createBatch: (data: { course_ids: number[]; pay_method: string; return_url: string; trade_type?: string }) =>
    api.post('/orders/batch', data),
  getList: (params?: Record<string, any>) => api.get('/orders', { params }),
  getDetail: (orderNo: string) => api.get(`/orders/${orderNo}`),
  // 企业级能力：关单 / 退款 / 同步
  close: (orderNo: string) => api.post(`/orders/${orderNo}/close`),
  refund: (orderNo: string) => api.post(`/orders/${orderNo}/refund`),
  sync: (orderNo: string) => api.post(`/orders/${orderNo}/sync`),
  getEnrollments: () => api.get('/orders/enrollments'),
  updateProgress: (enrollmentId: number, data: Record<string, any>) =>
    api.post(`/orders/enrollments/${enrollmentId}/progress`, data),
};

// ==================== 购物车 ====================

export const cartApi = {
  getCart: () => api.get('/cart'),
  add: (course_id: number) => api.post(`/cart?course_id=${course_id}`),
  remove: (course_id: number) => api.delete(`/cart/${course_id}`),
  clear: () => api.delete('/cart'),
  // 合并结算（多课程合并成一个订单并支付）
  checkout: (data: { course_ids: number[]; pay_method: string; return_url?: string; trade_type?: string }) =>
    api.post('/cart/checkout', data),
};

// ==================== 内容 ====================

export const contentApi = {
  getLives: (params?: Record<string, any>) => api.get('/content/lives', { params }),
  getBootcamps: (params?: Record<string, any>) => api.get('/content/bootcamps', { params }),
  getBanners: (position = 'home') => api.get('/content/banners', { params: { position } }),
  getResources: () => api.get('/content/resources'),
  downloadResource: (id: number) => api.post(`/content/resources/${id}/download`),
};
