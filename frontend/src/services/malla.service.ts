import { api } from './api';
import {type RamoCompleto } from '../types';

export const mallaService = {
  async getMallas(codigoCarrera: string, catalogo: string): Promise<any[]> {
    const response = await api.get('/api/mallas', {
      params: { codigoCarrera, catalogo }
    });
    return response.data;
  }
};