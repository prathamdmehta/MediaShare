// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { authApi } from './api/auth'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import InboxPage from './pages/InboxPage'
import SentPage from './pages/SentPage'
import UploadPage from './pages/UploadPage'
import ProfilePage from './pages/ProfilePage'
import SearchPage from './pages/SearchPage'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Layout from './components/layout/Layout'

function App() {
    const { isAuthenticated, setAuth, clearAuth } = useAuthStore()

    useEffect(() => {
        if (!isAuthenticated) return
        authApi.me()
            .then(res => {
                const token = localStorage.getItem('access_token') || ''
                setAuth(res.data, token)
            })
            .catch(() => clearAuth())
    }, [])

    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/inbox" element={<InboxPage />} />
                        <Route path="/sent" element={<SentPage />} />
                        <Route path="/upload" element={<UploadPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/search" element={<SearchPage />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App