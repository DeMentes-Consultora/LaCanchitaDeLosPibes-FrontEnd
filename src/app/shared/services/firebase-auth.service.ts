import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Auth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, signOut, user, User } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { UserRole } from '../interfaces/auth.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private auth: Auth = inject(Auth);
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  
  // Observable del usuario de Firebase
  public user$ = user(this.auth);
  
  // Estado interno
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor() {
    // Escuchar cambios de autenticación de Firebase
    this.user$.subscribe(firebaseUser => {
      if (firebaseUser) {
        // Usuario autenticado con Firebase, sincronizar con nuestro sistema
        const providerId = firebaseUser.providerData?.[0]?.providerId;
        const provider = providerId === 'facebook.com' ? 'facebook' : 'google';
        this.syncWithBackend(firebaseUser, provider);
      }
    });
  }

  /**
   * Iniciar sesión/registro social con proveedor seleccionado
   */
  async signInWithSocial(providerName: 'google' | 'facebook'): Promise<{success: boolean, message: string, user?: any}> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, message: 'La autenticación social no está disponible en el servidor' };
    }

    try {
      this.loadingSubject.next(true);

      const provider = providerName === 'google'
        ? new GoogleAuthProvider()
        : new FacebookAuthProvider();

      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(this.auth, provider);
      const firebaseUser = result.user;

      if (!firebaseUser) {
        this.loadingSubject.next(false);
        return { success: false, message: 'No se pudo obtener información del usuario' };
      }

      const backendResult = await this.syncWithBackend(firebaseUser, providerName);

      this.loadingSubject.next(false);
      return {
        success: true,
        message: 'Inicio de sesión exitoso',
        user: backendResult
      };
    } catch (error: any) {
      this.loadingSubject.next(false);
      console.error(`Error en login con ${providerName}:`, error);

      let errorMessage = 'Error desconocido';

      if (error.code) {
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = 'Inicio de sesión cancelado por el usuario';
            break;
          case 'auth/popup-blocked':
            errorMessage = 'Popup bloqueado. Por favor, permite popups para este sitio';
            break;
          case 'auth/cancelled-popup-request':
            errorMessage = 'Solicitud de popup cancelada';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Error de red. Verifica tu conexión a internet';
            break;
          case 'auth/account-exists-with-different-credential':
            errorMessage = 'Este email ya está vinculado a otro proveedor de acceso';
            break;
          default:
            errorMessage = `Error de autenticación: ${error.code}`;
        }
      }

      return { success: false, message: errorMessage };
    }
  }

  /**
   * Iniciar sesión con Google
   */
  async signInWithGoogle(): Promise<{success: boolean, message: string, user?: any}> {
    return this.signInWithSocial('google');
  }

  /**
   * Iniciar sesión/registro con Facebook
   */
  async signInWithFacebook(): Promise<{success: boolean, message: string, user?: any}> {
    return this.signInWithSocial('facebook');
  }

  /**
   * Cerrar sesión
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      // También cerrar sesión en nuestro sistema
      this.authService.clearCurrentUser();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  /**
   * Sincronizar usuario de Firebase con nuestro backend
   */
  private async syncWithBackend(firebaseUser: User, provider: 'google' | 'facebook' = 'google'): Promise<any> {
    try {
      // Extraer datos del usuario de Firebase
      const userData = {
        nombre: this.extractFirstName(firebaseUser.displayName || ''),
        apellido: this.extractLastName(firebaseUser.displayName || ''),
        email: firebaseUser.email || '',
        telefono: firebaseUser.phoneNumber || '',
        photoURL: firebaseUser.photoURL || '',
        firebaseUid: firebaseUser.uid,
        provider
      };

      console.log('🔄 Sincronizando con backend...', userData);
      console.log('🌐 URL Backend:', `${environment.backendUrl}/google-auth.php`);

      // Usar el endpoint específico para autenticación con Google
      const response = await fetch(`${environment.backendUrl}/google-auth.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      console.log('📡 Respuesta del servidor:', response.status, response.statusText);

      const result = await response.json();
      
      console.log('✅ Resultado del backend:', result);
      
      if (result.success && result.user) {
        // Actualizar el estado de autenticación en nuestro servicio
        this.authService.setUserFromFirebase(result.user);
        return result.user;
      } else {
        console.error('❌ Error del servidor:', result.message);
        // Aunque falle la sincronización con el backend, 
        // crear un usuario temporal y establecerlo en el sistema
        const fallbackUser = {
          id_usuario: 0,
          email: firebaseUser.email || 'no-email@firebase.com',
          nombre: this.extractFirstName(firebaseUser.displayName || ''),
          apellido: this.extractLastName(firebaseUser.displayName || ''),
          photoURL: firebaseUser.photoURL || '',
          provider,
          id_rol: 6, // Cliente por defecto
          rol: 'Cliente' as UserRole
        };
        
        // IMPORTANTE: Establecer el usuario en el AuthService aunque falle el backend
        this.authService.setUserFromFirebase(fallbackUser);
        return fallbackUser;
      }
    } catch (error) {
      console.error('💥 Error sincronizando con backend:', error);
      // Aunque falle la sincronización con el backend, 
      // crear un usuario temporal y establecerlo en el sistema
      const fallbackUser = {
        id_usuario: 0,
        email: firebaseUser.email || 'no-email@firebase.com',
        nombre: this.extractFirstName(firebaseUser.displayName || ''),
        apellido: this.extractLastName(firebaseUser.displayName || ''),
        photoURL: firebaseUser.photoURL || '',
        provider,
        id_rol: 6, // Cliente por defecto
        rol: 'Cliente' as UserRole
      };
      
      // IMPORTANTE: Establecer el usuario en el AuthService aunque falle la conexión
      this.authService.setUserFromFirebase(fallbackUser);
      return fallbackUser;
    }
  }

  /**
   * Extraer nombre del displayName
   */
  private extractFirstName(displayName: string): string {
    return displayName.split(' ')[0] || '';
  }

  /**
   * Extraer apellido del displayName
   */
  private extractLastName(displayName: string): string {
    const parts = displayName.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  /**
   * Obtener usuario actual de Firebase
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Verificar si está autenticado con Firebase
   */
  isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }
}
