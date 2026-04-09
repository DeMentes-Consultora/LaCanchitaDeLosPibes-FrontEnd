import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import {
  UsuariosFormComponent,
  FormMode,
} from '../usuarios-form/usuarios-form.component';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { ConfigService } from '../../services/config.service';
import { User, UserRole } from '../../interfaces';

export interface UsuariosModalData {
  mode: FormMode;
  user?: User;
  title?: string;
  currentUser?: User;
  currentUserRole?: UserRole;
  rolId?: number; // ID del rol para el formulario
}

@Component({
  selector: 'app-usuarios-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    UsuariosFormComponent,
  ],
  templateUrl: './usuarios-modal.component.html',
  styleUrls: ['./usuarios-modal.component.css'],
})
export class UsuariosModalComponent implements OnInit {
  @Input() tipo: 'sign-in' | 'sign-up' | 'editar' | 'detalle' | 'contacto' = 'sign-in';
  @Input() usuario: any = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() modeChange = new EventEmitter<FormMode>();

  loading = false;
  currentMode: FormMode;

  // Usuario preparado para el formulario con rol como número
  get usuarioParaFormulario() {
    if (!this.data.user) return null;
    
    return {
      ...this.data.user,
      // Convertir rol de string a number usando rolId si está disponible
      rol: this.data.rolId || this.mapRoleNameToId(this.data.user.rol || 'Cliente')
    };
  }

  // Mapeo de nombres de rol a IDs
  private roleMap: { [key: string]: number } = {
    'Dueño': 1,
    'Administrador': 2,
    'Bar': 3,
    'Alquiler': 4,
    'Estacionamiento': 5,
    'Cliente': 6
  };

  private mapRoleNameToId(roleName: string): number {
    return this.roleMap[roleName] || 6;
  }

  constructor(
    public dialogRef: MatDialogRef<UsuariosModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UsuariosModalData,
    private authService: AuthService,
    private usersService: UsersService,
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.currentMode = this.data.mode;
  }

  ngOnInit() {
    this.setupModal();
  }

  /**
   * Configurar el modal según el modo
   */
  mapFormMode(mode: FormMode): 'sign-in' | 'sign-up' | 'editar' | 'detalle' | 'crear' | 'contacto' {
    switch (mode) {
      case 'login':
        return 'sign-in';
      case 'register':
        return 'sign-up';
      case 'edit':
        return 'editar';
      case 'create':
        return 'crear';
      case 'view':
        return 'detalle';
      case 'contacto':
        return 'contacto';
      default:
        return 'sign-in';
    }
  }

  private setupModal() {
    // Configurar el tamaño del modal según el modo
    switch (this.data.mode) {
      case 'login':
        this.dialogRef.updateSize('400px');
        break;
      case 'contacto':
        this.dialogRef.updateSize('500px');
        break;
      case 'register':
      case 'create':
      case 'edit':
      case 'view':
        this.dialogRef.updateSize('600px');
        break;
    }
  }

  /**
   * Obtener el título del modal
   */
  getModalTitle(): string {
    if (this.data.title) {
      return this.data.title;
    }

    switch (this.currentMode) {
      case 'login':
        return 'Iniciar Sesión';
      case 'register':
        return 'Crear Cuenta Nueva';
      case 'contacto':
        return 'Hacenos una Consulta o Sugerencia';
      case 'create':
        return 'Crear Nuevo Usuario';
      case 'edit':
        return `Editar Usuario: ${this.data.user?.nombre} ${this.data.user?.apellido}`;
      case 'view':
        return `Detalles de Usuario: ${this.data.user?.nombre} ${this.data.user?.apellido}`;
      default:
        return 'Gestión de Usuario';
    }
  }

  /**
   * Obtener el icono del modal
   */
  getModalIcon(): string {
    switch (this.currentMode) {
      case 'login':
        return 'login';
      case 'register':
        return 'person_add';
      case 'contacto':
        return 'contact_support';
      case 'create':
        return 'group_add';
      case 'edit':
        return 'edit';
      default:
        return 'person';
    }
  }

  /**
   * Obtener el mensaje de loading
   */
  getLoadingMessage(): string {
    switch (this.currentMode) {
      case 'login':
        return 'Iniciando sesión...';
      case 'register':
        return 'Creando cuenta...';
      case 'create':
        return 'Creando usuario...';
      case 'edit':
        return 'Actualizando usuario...';
      default:
        return 'Procesando...';
    }
  }

  /**
   * Verificar si debe mostrar el footer
   */
  showFooter(): boolean {
    return this.currentMode === 'login' || this.currentMode === 'register';
  }

  /**
   * Obtener el texto del footer
   */
  getFooterText(): string {
    switch (this.currentMode) {
      case 'login':
        return 'Ingresa tus credenciales para acceder al sistema';
      case 'register':
        return 'Completa todos los campos para crear tu cuenta';
      case 'create':
        return 'Solo administradores pueden crear usuarios';
      case 'edit':
        return 'Modifica los campos que desees actualizar';
      default:
        return '';
    }
  }

  /**
   * Cambiar entre modos (login/register)
   */
  switchMode(newMode: FormMode) {
    this.currentMode = newMode;
    this.data.mode = newMode;
    this.setupModal();
   // this.modeChange.emit(newMode);
  }

  /**
   * Manejar cambio de modo desde el formulario
   */
  onModeChange(newMode: FormMode) {
    this.switchMode(newMode);
  }

  /**
   * Manejar envío del formulario
   */
  async onFormSubmit(formData: any) {
    // Flujo social (Google/Facebook) ya autenticado en frontend/backend.
    if (formData?.success === true && formData?.provider) {
      this.dialogRef.close({
        action: 'submit',
        data: formData,
        mode: this.currentMode,
        success: true,
        refresh: false
      });
      return;
    }

    this.loading = true;

    try {
      let result;

      switch (this.currentMode) {
        case 'login':
          result = await this.handleLogin(formData);
          break;
        case 'register':
          result = await this.handleRegister(formData);
          break;
        case 'contacto':
          result = await this.handleContact(formData);
          break;
        case 'create':
          result = await this.handleCreateUser(formData);
          break;
        case 'edit':
          result = await this.handleEditUser(formData);
          break;
        default:
          result = { success: false, message: 'Modo no válido' };
      }

      this.dialogRef.close({
        action: 'submit',
        data: result.success ? formData : result, // Devolver formData si es exitoso
        mode: this.currentMode,
        success: result.success,
        refresh: !result.success, // Solo refresh si hay error (fallback)
      });
    } catch (error) {
      console.error('Error en el formulario:', error);
      this.loading = false;
    }
  }

  /**
   * Manejar login
   */
  private handleLogin(formData: any): Promise<any> {
    return new Promise((resolve) => {
      this.authService.login(formData).subscribe({
        next: (response) => resolve(response),
        error: (error) =>
          resolve({
            success: false,
            message: error.message || 'Error al iniciar sesión',
          }),
      });
    });
  }

  /**
   * Manejar registro
   */
  private handleRegister(formData: any): Promise<any> {
    return new Promise((resolve) => {
      this.authService.register(formData).subscribe({
        next: (response) => {
          if (response.success && (response as any).pendiente_aprobacion) {
            resolve({
              success: true,
              message: response.message || 'Registro exitoso. Tu cuenta quedó pendiente de aprobación.',
              autoLogin: false,
              pendiente_aprobacion: true
            });
            return;
          }

          if (response.success) {
            // Auto-login después del registro exitoso
            const loginData = {
              email: formData.email,
              clave: formData.clave
            };
            
            this.authService.login(loginData).subscribe({
              next: (loginResponse) => {
                if (loginResponse.success) {
                  resolve({
                    success: true,
                    message: '¡Cuenta creada exitosamente! Ya estás logueado. Revisa tu email para la confirmación de registro.',
                    autoLogin: true
                  });
                } else {
                  resolve({
                    success: true,
                    message: 'Cuenta creada exitosamente. Revisa tu email para la confirmación y luego puedes iniciar sesión.',
                    autoLogin: false
                  });
                }
              },
              error: () => {
                resolve({
                  success: true,
                  message: 'Cuenta creada exitosamente. Revisa tu email para la confirmación y luego puedes iniciar sesión.',
                  autoLogin: false
                });
              }
            });
          } else {
            resolve(response);
          }
        },
        error: (error) =>
          resolve({
            success: false,
            message: error.message || 'Error al registrar usuario',
          }),
      });
    });
  }

  /**
   * Manejar creación de usuario
   */
  private handleCreateUser(formData: any): Promise<any> {
    return new Promise((resolve) => {
      this.usersService.createUser(formData).subscribe({
        next: (response) => resolve(response),
        error: (error) =>
          resolve({
            success: false,
            message: error.message || 'Error al crear usuario',
          }),
      });
    });
  }

  /**
   * Manejar edición de usuario
   */
  private handleEditUser(formData: any): Promise<any> {
    // Necesitamos agregar los IDs requeridos por el backend
    const updateData = {
      ...formData,
      id_empleado: this.data.user?.id_usuario || this.data.user?.id_empleado,
      id_persona: this.data.user?.id_persona,
      id_usuario: this.data.user?.id_usuario,
      usuario: formData.email, // El backend espera 'usuario' en lugar de 'email'
    };

    console.log('Enviando datos de actualización:', updateData);

    return new Promise((resolve) => {
      this.usersService.updateUser(updateData).subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          resolve(response);
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
          resolve({
            success: false,
            message: error.message || 'Error al actualizar usuario',
          });
        },
      });
    });
  }

  /**
   * Manejar formulario de contacto
   */
  private handleContact(formData: any): Promise<any> {
    return new Promise((resolve) => {
      console.log('Enviando datos de contacto:', formData);
      
      this.http.post(this.configService.getApiEndpoint('contacto'), formData)
        .subscribe({
          next: (response: any) => {
            console.log('✅ Consulta enviada exitosamente:', response);
            resolve({
              success: true,
              message: '¡Gracias por tu consulta! Te contactaremos pronto.'
            });
          },
          error: (error) => {
            console.error('❌ Error al enviar consulta:', error);
            resolve({
              success: false,
              message: 'Hubo un error al enviar tu consulta. Por favor, intenta nuevamente.'
            });
          }
        });
    });
  }

  /**
   * Cerrar el modal
   */
  close() {
    if (!this.loading) {
      this.dialogRef.close({
        action: 'cancel',
      });
    }
  }
}
