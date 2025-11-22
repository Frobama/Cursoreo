import { api } from './api';
import {type RamoAvanceCompleto } from '../types';

export const avanceService = {
  async getAvance(rut: string, codcarrera: string, catalogo: string): Promise<RamoAvanceCompleto[]> {
    const response = await api.get('/api/avance', {
      params: { rut, codcarrera, catalogo }
    });
    return response.data;
  }
};