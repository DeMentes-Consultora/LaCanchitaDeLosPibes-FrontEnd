// Interfaces para el sistema de autenticación
export interface User {
  id?: number;
  nombre?: string;
  apellido?: string;
  email: string;
  clave?: string;
  edad?: number;
  dni?: string;
  telefono?: string;
  rol?: UserRole;
  fechaCreacion?: string;
  fechaModificacion?: string;
  
  // Campos que realmente devuelve el backend
  id_usuario?: number;
  id_rol?: number;
  nombre_rol?: string;
  
  // Campos adicionales para operaciones CRUD
  id_persona?: number;
  id_empleado?: number;

  // Campos de autenticación social
  provider?: 'google' | 'facebook';
  photoURL?: string;
  foto_perfil_url?: string;
  foto_perfil_public_id?: string;
}

export interface Employee extends User {
  id_empleado: number;
  activo: boolean;
}

export interface LoginRequest {
  email: string;
  clave: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  email: string;
  clave: string;
  edad?: number;
  dni?: string;
  telefono?: string;
  rol?: UserRole;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: User;
}

export type UserRole = 'Cliente' | 'Empleado' | 'Administrador' | 'Dueño' | 'Bar' | 'Estacionamiento';

export const USER_ROLES: Record<string, UserRole> = {
  CLIENTE: 'Cliente',
  EMPLEADO: 'Empleado',
  ADMINISTRADOR: 'Administrador',
  DUEÑO: 'Dueño',
  BAR: 'Bar',
  ESTACIONAMIENTO: 'Estacionamiento'
} as const;
