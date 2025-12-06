import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { AdminProtectedRoute } from './AdminProtectedRoute';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import MallaPage from '../pages/MallaPage';
import ProyeccionPage from '../pages/ProyeccionPage';
import ManualProjectionPage from '../pages/ManualProjectionPage';
import NotFoundPage from '../pages/NotFoundPage';

import AdminLogin from '../pages/admin/AdminLogin';
import AdminDashboard from '../pages/admin/AdminDashboard';

import MainLayout from '../layouts/MainLayout'
import AuthLayout from '../layouts/AuthLayout'
import CompareProjectionsPage from '../pages/CompareProjectionsPage';

export const AppRoutes = () => {
    return (
        <Routes>
            <Route element={<AuthLayout />}>
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <LoginPage />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/admin/login"
                    element={
                            <AdminLogin />
                    }
                />
            </Route>

            <Route element={<MainLayout />}>
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/malla"
                        element={
                            <ProtectedRoute>
                                <MallaPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/proyeccion"
                        element={
                            <ProtectedRoute>
                                <ProyeccionPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/proyeccion/manual"
                        element={
                            <ProtectedRoute>
                                <ManualProjectionPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/proyeccion/comparar"
                        element={
                            <ProtectedRoute>
                                <CompareProjectionsPage />
                            </ProtectedRoute>
                        }
                    />

            </Route>

            <Route 
                path="/admin/dashboard" 
                element={
                    <AdminProtectedRoute>
                        <AdminDashboard />
                    </AdminProtectedRoute>
                } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};