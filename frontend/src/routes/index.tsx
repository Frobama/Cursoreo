import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import MallaPage from '../pages/MallaPage';
import ProyeccionPage from '../pages/ProyeccionPage';
import ManualProjectionPage from '../pages/ManualProjectionPage';
import NotFoundPage from '../pages/NotFoundPage';

import MainLayout from '../layouts/MainLayout'
import AuthLayout from '../layouts/AuthLayout'

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
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};