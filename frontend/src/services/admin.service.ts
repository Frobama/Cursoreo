import {api} from './api';
import type { Profesor, AdminStats, CourseProjection } from '../types/admin';

export const adminService = {
  async login(email: string, password: string) {
    const response = await api.post('/api/admin/login', { email, password });
    return response.data;
  },

  async getStats(): Promise<AdminStats> {
    const response = await api.get('/api/admin/stats');
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
};