import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import '@wangeditor/editor/dist/css/style.css';
import './index.css';

// 部署子路径（与 vite.config.ts 的 base / Docker 的 VITE_BASE 保持一致）：
//   - 本地开发：无 VITE_BASE，basename = ''
//   - Docker 生产：VITE_BASE=/admin/，basename = '/admin'
// BrowserRouter 的 basename 不能带结尾斜杠，这里统一处理。
const basePath = (import.meta.env.VITE_BASE || '/').replace(/\/+$/, '') || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#00C4D4',
          borderRadius: 8,
          colorBgContainer: '#ffffff',
        },
      }}
    >
      <BrowserRouter basename={basePath}>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
