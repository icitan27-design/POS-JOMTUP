import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OrderTaking from './pages/OrderTaking'
import Checkout from './pages/Checkout'
import Receipt from './pages/Receipt'
import Bills from './pages/Bills'
import MenuManage from './pages/MenuManage'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Settings from './pages/Settings'
import CustomerOrder from './pages/CustomerOrder'
import TableQR from './pages/TableQR'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* หน้าลูกค้าสั่งอาหารเอง (สาธารณะ ไม่ต้องล็อกอิน) */}
              <Route path="/menu-order" element={<CustomerOrder />} />

              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                {/* หน้าเฉพาะ admin */}
                <Route index element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
                <Route path="menu" element={<ProtectedRoute adminOnly><MenuManage /></ProtectedRoute>} />
                <Route path="reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
                <Route path="table-qr" element={<ProtectedRoute adminOnly><TableQR /></ProtectedRoute>} />

                {/* หน้าที่ทั้ง admin และ cashier เข้าได้ */}
                <Route path="order" element={<OrderTaking />} />
                <Route path="bills" element={<Bills />} />
                <Route path="checkout/:orderId" element={<Checkout />} />
                <Route path="receipt/:orderId" element={<Receipt />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
