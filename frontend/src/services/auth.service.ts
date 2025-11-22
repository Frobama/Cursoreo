import { api } from './api';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.get('/api/login', {
      params: { email, password }
    });
    return response.data; // Retorna { ...userData, token, expiresIn }
  },

  async validateToken(token: string) {
    const response = await api.get('/api/validar-token', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.user;
  }
};