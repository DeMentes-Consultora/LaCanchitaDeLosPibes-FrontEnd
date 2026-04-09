import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { 
  User, 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  UserRole 
} from '../interfaces/auth.interface';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  
  // Estado del usuario actual
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Estado de autenticación
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private router: Router
  ) {
    // Verificar si hay usuario guardado en localStorage (solo en el navegador)
    this.checkStoredUser();
  }

  /**
   * Métodos seguros para localStorage que funcionan con SSR
   */
  private setItem(key: string, value: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(key, value);
    }
  }

  private getItem(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(key);
    }
    return null;
  }

  private removeItem(key: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Iniciar sesión
   */
  login(loginData: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.configService.getApiEndpoint('loguin'), loginData)
      .pipe(
        tap(response => {
          if (response.success && response.user) {
            this.setCurrentUser(response.user);
          }
        })
      );
  }

  /**
   * Registrar nuevo usuario
   */
  register(registerData: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(this.configService.getApiEndpoint('register'), registerData);
  }

  /**
   * Cerrar sesión
   */
  logout(): Observable<any> {
    return this.http.post(this.configService.getApiEndpoint('cerrarSesion'), {})
      .pipe(
        tap(() => {
          this.endSessionAndRedirect();
        }),
        catchError((error) => {
          // Incluso si falla el backend, cerramos sesión local y redirigimos.
          this.endSessionAndRedirect();
          return throwError(() => error);
        })
      );
  }

  /**
   * Wrapper de conveniencia para componentes: ejecuta logout y absorbe errores
   * porque la limpieza y redirección ya se resuelven dentro de logout().
   */
  logoutAndRedirect(): void {
    this.logout().subscribe({
      next: () => undefined,
      error: () => undefined
    });
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Obtener rol del usuario actual
   */
  getCurrentUserRole(): UserRole | null {
    const user = this.getCurrentUser();
    return user?.rol || null;
  }

  /**
   * Verificar si está autenticado
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Verificar si el usuario tiene un rol específico
   */
  hasRole(role: UserRole): boolean {
    const currentRole = this.getCurrentUserRole();
    return currentRole === role;
  }

  /**
   * Verificar si el usuario tiene uno de los roles especificados
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const currentRole = this.getCurrentUserRole();
    return currentRole ? roles.includes(currentRole) : false;
  }

  /**
   * Verificar si es administrador o dueño
   */
  isAdminOrOwner(): boolean {
    return this.hasAnyRole(['Administrador', 'Dueño']);
  }

  /**
   * Verificar si es dueño
   */
  isOwner(): boolean {
    return this.hasRole('Dueño');
  }

  /**
   * Limpiar usuario actual (método público)
   */
  clearCurrentUser(): void {
    this.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Punto centralizado para finalizar sesión y redirigir al home.
   */
  endSessionAndRedirect(redirectTo: string = '/home'): void {
    this.clearCurrentUser();
    this.router.navigate([redirectTo]);
  }

  /**
   * Establecer usuario actual desde Firebase Auth (método público)
   */
  setUserFromFirebase(user: User): void {
    this.setCurrentUser(user);
  }

  /**
   * Establecer usuario actual
   */
  private setCurrentUser(user: User): void {
    this.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Verificar usuario almacenado en localStorage (solo en el navegador)
   */
  private checkStoredUser(): void {
    const storedUser = this.getItem('currentUser');
    if (storedUser) {
      try {
        const user: User = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.removeItem('currentUser');
      }
    }
  }
}
