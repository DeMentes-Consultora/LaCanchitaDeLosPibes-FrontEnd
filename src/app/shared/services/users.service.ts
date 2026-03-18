import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { User } from '../interfaces';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export interface UserResponse {
  success: boolean;
  message: string;
  user?: User;
  users?: User[];
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = environment.apiUrl;
  
  // Cache en memoria usando signals
  private usersCache = signal<User[]>([]);
  private lastFetch = signal<number>(0);
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  /**
   * Obtener todos los usuarios/empleados con cache inteligente
   */
  getUsers(forceRefresh = false): Observable<UserResponse> {
    // Solo usar cache en el navegador, no en el servidor
    if (isPlatformBrowser(this.platformId) && !forceRefresh) {
      const now = Date.now();
      const isCacheValid = (now - this.lastFetch()) < this.CACHE_DURATION;
      
      if (isCacheValid && this.usersCache().length > 0) {
        console.log('✅ Usando datos del cache local');
        return of({
          success: true,
          message: 'Datos del cache',
          users: this.usersCache()
        });
      }
    }

    console.log('🌐 Solicitando datos del servidor');
    return this.http.get<UserResponse>(`${this.apiUrl}/listarEmpleados.php`).pipe(
      tap(response => {
        if (response.success && response.users) {
          this.usersCache.set(response.users);
          this.lastFetch.set(Date.now());
        }
      })
    );
  }

  /**
   * Crear nuevo usuario
   */
  createUser(userData: Partial<User>): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/register.php`, userData).pipe(
      tap(response => {
        if (response.success && response.user) {
          // Agregar al cache local
          const currentUsers = this.usersCache();
          this.usersCache.set([...currentUsers, response.user]);
        }
      })
    );
  }

  /**
   * Actualizar usuario
   */
  updateUser(userData: Partial<User>): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/modificarEmpleado.php`, userData).pipe(
      tap(response => {
        if (response.success) {
          // Actualizar en cache local
          this.updateUserInCache(userData);
        }
      })
    );
  }

  /**
   * Eliminar usuario
   */
  deleteUser(userId: number): Observable<UserResponse> {
    return this.http.delete<UserResponse>(`${this.apiUrl}/eliminarEmpleado.php?id=${userId}`).pipe(
      tap(response => {
        if (response.success) {
          // Remover del cache local
          const currentUsers = this.usersCache();
          const updatedUsers = currentUsers.filter(user => user.id !== userId);
          this.usersCache.set(updatedUsers);
        }
      })
    );
  }

  /**
   * Obtener usuario por ID
   */
  getUserById(userId: number): Observable<UserResponse> {
    // Primero intentar del cache
    if (isPlatformBrowser(this.platformId)) {
      const cachedUser = this.usersCache().find(user => user.id === userId);
      if (cachedUser) {
        console.log('✅ Usuario encontrado en cache');
        return of({
          success: true,
          message: 'Usuario del cache',
          user: cachedUser
        });
      }
    }

    return this.http.get<UserResponse>(`${this.apiUrl}/listarEmpleados.php?id=${userId}`);
  }

  /**
   * Actualizar usuario específico en cache
   */
  private updateUserInCache(updatedData: Partial<User>) {
    const currentUsers = this.usersCache();
    const userIndex = currentUsers.findIndex(user => 
      user.id === updatedData.id || 
      user.id_usuario === updatedData.id_usuario
    );

    if (userIndex !== -1) {
      const updatedUsers = [...currentUsers];
      updatedUsers[userIndex] = { ...updatedUsers[userIndex], ...updatedData };
      this.usersCache.set(updatedUsers);
      console.log('✅ Usuario actualizado en cache local');
    }
  }

  /**
   * Limpiar cache (útil para logout o cuando sea necesario)
   */
  clearCache() {
    this.usersCache.set([]);
    this.lastFetch.set(0);
  }

  /**
   * Obtener usuarios del cache (para uso directo)
   */
  getCachedUsers(): User[] {
    return this.usersCache();
  }
}
