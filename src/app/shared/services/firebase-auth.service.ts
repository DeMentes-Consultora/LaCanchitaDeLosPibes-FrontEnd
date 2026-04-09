import { Injectable, inject, Injector, PLATFORM_ID, runInInjectionContext } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Auth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, signOut, user, User } from '@angular/fire/auth';
import { UserCredential } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

type SocialAuthResult = {
  success: boolean;
  message: string;
  user?: any;
  requiresRegistration?: boolean;
  prefillData?: any;
  missingFields?: string[];
};

type PendingGoogleRegistration = {
  provider: 'google' | 'facebook';
  firebaseUid: string;
  idToken: string;
  photoURL: string;
  email: string;
  prefillData: any;
};

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private auth: Auth = inject(Auth);
  private injector = inject(Injector);
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  
  // Observable del usuario de Firebase
  public user$ = user(this.auth);
  
  // Estado interno
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  private pendingGoogleRegistration: PendingGoogleRegistration | null = null;

  private logDebug(message: string, payload?: unknown): void {
    if (!environment.debug) {
      return;
    }

    if (payload !== undefined) {
      console.log(message, payload);
      return;
    }

    console.log(message);
  }

  constructor() {
    // Escuchar cambios de autenticación de Firebase
    this.user$.subscribe(firebaseUser => {
      if (!firebaseUser) {
        return;
      }

      const currentUser = this.authService.getCurrentUser();
      if (currentUser?.email === (firebaseUser.email || '')) {
        return;
      }

      // Solo intentamos sincronización automática para Facebook.
      // Google requiere id_token OAuth y ese token se envía desde signInWithSocial.
      const providerId = firebaseUser.providerData?.[0]?.providerId;
      if (providerId === 'facebook.com') {
        void this.syncWithBackend(firebaseUser, 'facebook');
      }
    });
  }

  /**
   * Iniciar sesión/registro social con proveedor seleccionado
   */
  async signInWithSocial(providerName: 'google' | 'facebook'): Promise<SocialAuthResult> {
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

      const result = await runInInjectionContext(this.injector, () => signInWithPopup(this.auth, provider));
      const firebaseUser = result.user;

      if (!firebaseUser) {
        this.loadingSubject.next(false);
        return { success: false, message: 'No se pudo obtener información del usuario' };
      }

      const googleIdToken = providerName === 'google'
        ? GoogleAuthProvider.credentialFromResult(result as UserCredential)?.idToken ?? ''
        : '';

      const backendResult = await this.syncWithBackend(firebaseUser, providerName, googleIdToken);

      if (backendResult.requiresRegistration) {
        this.pendingGoogleRegistration = {
          provider: providerName,
          firebaseUid: firebaseUser.uid,
          idToken: googleIdToken,
          photoURL: firebaseUser.photoURL || '',
          email: firebaseUser.email || '',
          prefillData: backendResult.prefillData || {}
        };

        await runInInjectionContext(this.injector, () => signOut(this.auth));
        this.authService.clearCurrentUser();
        this.loadingSubject.next(false);
        return backendResult;
      }

      if (!backendResult.success) {
        await runInInjectionContext(this.injector, () => signOut(this.auth));
        this.authService.clearCurrentUser();
        this.loadingSubject.next(false);
        return backendResult;
      }

      this.loadingSubject.next(false);
      return {
        success: true,
        message: backendResult.message || 'Inicio de sesión exitoso',
        user: backendResult.user
      };
    } catch (error: any) {
      this.loadingSubject.next(false);
      if (environment.debug) {
        console.error(`Error en login con ${providerName}:`, error);
      }

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
  async signInWithGoogle(): Promise<SocialAuthResult> {
    return this.signInWithSocial('google');
  }

  /**
   * Iniciar sesión/registro con Facebook
   */
  async signInWithFacebook(): Promise<SocialAuthResult> {
    return this.signInWithSocial('facebook');
  }

  /**
   * Cerrar sesión
   */
  async signOut(): Promise<void> {
    try {
      await runInInjectionContext(this.injector, () => signOut(this.auth));
      // También cerrar sesión en nuestro sistema
      this.authService.endSessionAndRedirect();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  /**
   * Sincronizar usuario de Firebase con nuestro backend
   */
  private async syncWithBackend(
    firebaseUser: User,
    provider: 'google' | 'facebook' = 'google',
    googleIdToken = ''
  ): Promise<SocialAuthResult> {
    try {
      // Extraer datos del usuario de Firebase
      const userData = {
        nombre: this.extractFirstName(firebaseUser.displayName || ''),
        apellido: this.extractLastName(firebaseUser.displayName || ''),
        email: firebaseUser.email || '',
        telefono: firebaseUser.phoneNumber || '',
        photoURL: firebaseUser.photoURL || '',
        firebaseUid: firebaseUser.uid,
        provider,
        id_token: googleIdToken,
        mode: 'login'
      };

      this.logDebug('Sincronizando con backend...', userData);
      this.logDebug('URL Backend: ' + `${environment.backendUrl}/google-auth.php`);

      // Usar el endpoint específico para autenticación con Google
      const response = await fetch(`${environment.backendUrl}/google-auth.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      this.logDebug(`Respuesta del servidor: ${response.status} ${response.statusText}`);

      const result = await response.json();

      this.logDebug('Resultado del backend:', result);
      
      if (result.success && result.user) {
        // Actualizar el estado de autenticación en nuestro servicio
        this.authService.setUserFromFirebase(result.user);
        this.pendingGoogleRegistration = null;
        return {
          success: true,
          message: result.message || 'Inicio de sesión exitoso',
          user: result.user
        };
      }

      if (result.requires_registration) {
        return {
          success: false,
          requiresRegistration: true,
          message: result.message || 'Debes completar el registro para continuar con Google',
          prefillData: result.prefill || userData,
          missingFields: Array.isArray(result.missing_fields) ? result.missing_fields : []
        };
      }

      if (environment.debug) {
        console.error('Error del servidor:', result.message);
      }
      return {
        success: false,
        message: result.message || 'No se pudo guardar el usuario en la base de datos'
      };
    } catch (error) {
      if (environment.debug) {
        console.error('Error sincronizando con backend:', error);
      }
      return {
        success: false,
        message: 'No se pudo sincronizar el usuario con el backend'
      };
    }
  }

  hasPendingGoogleRegistration(): boolean {
    return this.pendingGoogleRegistration !== null;
  }

  getPendingGoogleRegistrationPrefill(): any | null {
    return this.pendingGoogleRegistration?.prefillData || null;
  }

  clearPendingGoogleRegistration(): void {
    this.pendingGoogleRegistration = null;
  }

  async completePendingGoogleRegistration(formData: {
    nombre: string;
    apellido: string;
    edad: string | number;
    telefono: string;
    dni?: string;
  }): Promise<SocialAuthResult> {
    if (!this.pendingGoogleRegistration) {
      return {
        success: false,
        message: 'No hay un registro de Google pendiente para completar.'
      };
    }

    const pending = this.pendingGoogleRegistration;
    const payload = {
      mode: 'register',
      provider: pending.provider,
      firebaseUid: pending.firebaseUid,
      id_token: pending.idToken,
      photoURL: pending.photoURL,
      email: pending.email || pending.prefillData?.email || '',
      nombre: formData.nombre,
      apellido: formData.apellido,
      edad: String(formData.edad ?? '').trim(),
      telefono: String(formData.telefono ?? '').trim(),
      dni: String(formData.dni ?? '').trim(),
    };

    try {
      const response = await fetch(`${environment.backendUrl}/google-auth.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        if (result.user) {
          this.authService.setUserFromFirebase(result.user);
        }
        this.pendingGoogleRegistration = null;
        return {
          success: true,
          message: result.message || 'Registro completado con Google.',
          user: result.user
        };
      }

      return {
        success: false,
        message: result.message || 'No se pudo completar el registro con Google',
        requiresRegistration: !!result.requires_registration,
        prefillData: result.prefill || payload,
        missingFields: Array.isArray(result.missing_fields) ? result.missing_fields : []
      };
    } catch (error) {
      if (environment.debug) {
        console.error('Error completando registro pendiente con Google:', error);
      }
      return {
        success: false,
        message: 'No se pudo completar el registro con Google'
      };
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
