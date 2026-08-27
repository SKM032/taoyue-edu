import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';
import { authApi } from './lib/api';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import CourseList from './pages/CourseList';
import TrashList from './pages/TrashList';
import CourseCreate from './pages/CourseCreate';
import CourseContent from './pages/CourseContent';
import CoursePublish from './pages/CoursePublish';
import CourseDelivery from './pages/CourseDelivery';
import UserList from './pages/UserList';
import CategoryManage from './pages/CategoryManage';
import BannerManage from './pages/BannerManage';
import TeacherManage from './pages/TeacherManage';
import OrderList from './pages/OrderList';
import SalesOverview from './pages/SalesOverview';
import SettingsBasic from './pages/SettingsBasic';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setAuth, token } = useAuthStore();

  useEffect(() => {
    if (token) {
      authApi.getMe().then((res) => {
        setAuth(token, res.data);
      }).catch(() => {
        useAuthStore.getState().logout();
      });
    }
  }, []);

  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="courses" element={<CourseList />} />
          <Route path="courses/trash" element={<TrashList />} />
          <Route path="courses/create" element={<CourseCreate />} />
          <Route path="courses/edit/:id" element={<CourseCreate />} />
          <Route path="courses/:id/content" element={<CourseContent />} />
          <Route path="courses/publish" element={<CoursePublish />} />
          <Route path="courses/:id/delivery" element={<CourseDelivery />} />
          <Route path="users" element={<UserList />} />
          <Route path="categories" element={<CategoryManage />} />
          <Route path="banners" element={<BannerManage />} />
          <Route path="teachers" element={<TeacherManage />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="sales" element={<SalesOverview />} />
          <Route path="settings" element={<SettingsBasic />} />
        </Route>
      </Routes>
    </>
  );
}
