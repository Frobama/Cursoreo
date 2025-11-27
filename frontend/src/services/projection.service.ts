// src/services/projection.service.ts
import { api } from './api';
import type { SaveProjectionPayload, ValidationResult, ProjectionResponse } from '../types';

export const projectionService = {

  async setFavoriteProjection(idProyeccion: number) {
    const response = await api.post(`/api/proyeccion/${idProyeccion}/favorite`, {
      favorita: true
    });
    return response.data;
  },

  async getFavoriteProjection(rut: string, codigoCarrera: string, catalogo: string) {
    const response = await api.get('/api/proyeccion-favorita', {
      params: { rut, codigoCarrera, catalogo }
    });
    return response.data;
  },

  async saveProjection(payload: SaveProjectionPayload): Promise<ProjectionResponse> {
    const response = await api.post('/api/proyecciones', payload);
    return response.data;
  },

  async validateProjection(payload: SaveProjectionPayload): Promise<ValidationResult> {
    const response = await api.post('/api/validar-proyeccion', payload);
    return response.data;
  },

  async getProyecciones(rut: string, codigoCarrera: string, catalogo: string) {
    const response = await api.get('/api/proyecciones', {
      params: { rut, codigoCarrera, catalogo }
    });
    return response.data;
  },

  async getProyeccionById(id: number) {
    const response = await api.get(`/api/proyecciones/${id}`);
    return response.data;
  },

  async deleteProyeccion(id: number) {
    const response = await api.delete(`/api/proyecciones/${id}`);
    return response.data;
  }
};