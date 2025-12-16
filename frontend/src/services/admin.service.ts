import {api} from './api';
import type { Profesor, AdminStats, CourseProjection } from '../types/admin';

export const adminService = {
  async login(email: string, password: string) {
    const response = await api.post('/api/admin/login', { email, password });
    return response.data;
  },

  async getStats(): Promise<AdminStats> {
    const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('token');
    const response = await api.get('/api/admin/stats', {
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined
    });
    return response.data.stats;
  },

  async getCourseProjections(codigo: string, ano: number, semestre: number): Promise<CourseProjection> {
    const response = await api.get(`/api/admin/course/${codigo}/projections`, {
      params: { ano, semestre }
    });
    return response.data;
  },

  async getAllProjections(filters?: { carrera?: string; favoritas?: boolean }) {
    const response = await api.get('/api/admin/projections', { params: filters });
    return response.data;
  },
  async getMyAssignatures() {
    const response = await api.get('/api/admin/my-assignatures');
    return response.data.asignaturas as Array<{ codigo: string; nombre: string }>;
  },
  async getGlobalTopCourses() {
    const response = await api.get('/api/admin/global-top-courses');
    return (response.data.topCourses || []) as Array<{ codigo: string; nombre: string; count: number }>;
  },
};