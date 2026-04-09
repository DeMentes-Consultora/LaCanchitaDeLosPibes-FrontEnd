export interface Cancha {
  id_cancha: number;
  nombreCancha: string;
  precio: number;
  habilitado: number;
  cancelado: number;
  foto_cancha_url?: string | null;
  foto_cancha_public_id?: string | null;
  tipo?: string;
  descripcion?: string;
  imagen?: string;
}

export interface CanchaAdmin {
  idCancha: number;
  foto?: string | null;
  nombre: string;
  precio: number;
  estado: 'Habilitada' | 'Deshabilitada' | 'Cancelada';
  tipo: string;
  descripcion: string;
  foto_cancha_url?: string | null;
  foto_cancha_public_id?: string | null;
  // Campos adicionales para el backend
  id_cancha?: number;
  nombreCancha?: string;
  habilitado?: number;
  cancelado?: number;
}

export interface CanchaDisplay {
  id: number;
  nombre: string;
  tipo: string;
  descripcion: string;
  precio: number;
  imagen: string;
  caracteristicas: Array<{icon: string, nombre: string}>;
}
