import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FirebaseAuthService } from '../../services/firebase-auth.service';

export type FormMode = 'login' | 'register' | 'create' | 'edit' | 'view' | 'contacto';

@Component({
  selector: 'app-usuarios-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    MatSelectModule
  ],
  templateUrl: './usuarios-form.component.html',
  styleUrls: ['./usuarios-form.component.css'],
})
export class UsuariosFormComponent implements OnInit, OnChanges {
  @Input() tipo: 'sign-in' | 'sign-up' | 'editar' | 'detalle' | 'crear' | 'contacto' = 'sign-in';
  @Input() usuario: any = null;
  @Input() usuarioLogueado: any = null;
  @Input() loading: boolean = false;

  @Output() formSubmit = new EventEmitter<any>();
  @Output() formCancel = new EventEmitter<void>();
  @Output() modeChange = new EventEmitter<FormMode>();

  hidePassword = true;
  googleLoading = false;
  form: any;
  isCompletingGoogleRegistration = false;

  private firebaseAuth = inject(FirebaseAuthService);
  private snackBar = inject(MatSnackBar);

  availableRoles = [
    { value: 1, label: 'Dueño' },
    { value: 2, label: 'Administrador' },
    { value: 3, label: 'Bar' },
    { value: 4, label: 'Alquiler' },
    { value: 5, label: 'Estacionamiento' },
    { value: 6, label: 'Cliente' }
  ];

  canSelectRole: boolean = false;
  isOwnerRegistering: boolean = false;

  constructor(private fb: FormBuilder) {
    // Inicializar el formulario con todos los campos
    this.form = this.fb.group({
      nombre: [''],
      apellido: [''],
      email: [''],
      clave: [''],
      dni: [''],
      edad: [''],
      telefono: [''],
      mensaje: [''],
      rol: [6] // Cliente por defecto
    });
  }

  ngOnInit() {
    this.setupFormValidations();
    
    // Verificar si el usuario logueado es dueño (id_rol = 1)
    if (this.usuarioLogueado && this.usuarioLogueado.id_rol === 1) {
      this.isOwnerRegistering = true;
      this.canSelectRole = true;
    }

    // Cargar datos del usuario después de configurar las validaciones
    if (this.usuario) {
      this.form.patchValue(this.usuario);
    }

    this.applyPendingGooglePrefillIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tipo'] && !changes['tipo'].firstChange) {
      this.setupFormValidations();
      this.applyPendingGooglePrefillIfNeeded();
    }
  }

  private applyPendingGooglePrefillIfNeeded(): void {
    if (this.tipo !== 'sign-up') {
      this.isCompletingGoogleRegistration = false;
      return;
    }

    const prefill = this.firebaseAuth.getPendingGoogleRegistrationPrefill();
    this.isCompletingGoogleRegistration = !!prefill;

    if (!prefill) {
      return;
    }

    const prefilledData = {
      nombre: prefill.nombre || '',
      apellido: prefill.apellido || '',
      email: prefill.email || '',
      telefono: prefill.telefono || '',
      edad: prefill.edad || '',
      dni: prefill.dni || '',
      rol: 6
    };

    this.form.patchValue(prefilledData);
  }

  /**
   * Determina si debe mostrar el campo de rol
   */
  shouldShowRoleField(): boolean {
    // Modos de administración: siempre mostrar
    if (this.tipo === 'detalle' || this.tipo === 'editar' || this.tipo === 'crear') {
      return true;
    }
    
    // Modo registro: solo si es dueño
    if (this.tipo === 'sign-up') {
      return this.isOwnerRegistering && this.canSelectRole;
    }
    
    return false;
  }

  /**
   * Determina si el campo de rol debe ser de solo lectura
   */
  isRoleReadOnly(): boolean {
    // En modo detalle (view), el rol es solo lectura
    return this.tipo === 'detalle';
  }

  /**
   * Determina si todos los campos deben estar deshabilitados (solo lectura)
   */
  isReadOnlyMode(): boolean {
    return this.tipo === 'detalle';
  }

  /**
   * Obtiene el texto del rol basado en su ID
   */
  getRoleText(roleId: number | string): string {
    const role = this.availableRoles.find(r => r.value == roleId);
    return role ? role.label : 'Cliente';
  }

  private setupFormValidations() {
    // Configurar validaciones según el tipo
    if (this.tipo === 'sign-in') {
      // Solo validar email y password para login
      this.form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        clave: ['', Validators.required],
        nombre: [''],
        apellido: [''],
        dni: [''],
        edad: [''],
        telefono: [''],
        rol: [6]
      });
    } else if (this.tipo === 'contacto') {
      // Solo validar campos necesarios para contacto
      this.form = this.fb.group({
        nombre: ['', [Validators.required]],
        apellido: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        telefono: ['', [Validators.required, Validators.pattern(/^\d{10,11}$/)]],
        asunto: ['', [Validators.required]],
        mensaje: ['', [Validators.required, Validators.minLength(10)]],
        clave: [''],
        dni: [''],
        edad: [''],
        rol: [6]
      });
    } else if (this.tipo === 'sign-up' || this.tipo === 'editar' || this.tipo === 'detalle' || this.tipo === 'crear') {
      // Determinar si el rol es requerido
      const roleRequired = this.shouldShowRoleField() && !this.isReadOnlyMode();
      const roleValidators = roleRequired ? [Validators.required] : [];
      const defaultRoleValue = this.shouldShowRoleField() ? (this.usuario?.rol || '') : 6;
      
      // En modo solo lectura, no aplicar validaciones
      const isReadOnly = this.isReadOnlyMode();
      
      // Validaciones para contraseña
      const passwordValidators = isReadOnly
        ? []
        : (this.tipo === 'editar'
          ? [Validators.minLength(6)]
          : (this.tipo === 'sign-up' && this.firebaseAuth.hasPendingGoogleRegistration())
            ? []
            : [Validators.required, Validators.minLength(6)]);
      
      // Validaciones generales (solo si no es modo de solo lectura)
      const requiredValidator = isReadOnly ? [] : [Validators.required];
      const emailValidators = isReadOnly ? [] : [Validators.required, Validators.email];
      const dniValidators = isReadOnly ? [] : [Validators.pattern(/^$|^\d{7,8}$/)];
      const edadValidators = isReadOnly ? [] : [Validators.required, Validators.min(16), Validators.max(99)];
      const telefonoValidators = isReadOnly ? [] : [Validators.required, Validators.pattern(/^\d{10,11}$/)];
      
      // Validar todos los campos para registro/edición
      this.form = this.fb.group({
        nombre: ['', requiredValidator],
        apellido: ['', requiredValidator],
        email: ['', emailValidators],
        clave: ['', passwordValidators],
        dni: ['', dniValidators],
        edad: ['', edadValidators],
        telefono: ['', telefonoValidators],
        rol: [defaultRoleValue, roleValidators]
      });

      // NO deshabilitar el formulario, solo hacer los campos readonly en el HTML
    }
  }

  onSubmit() {
    // Prevenir envío en modo de solo lectura
    if (this.isReadOnlyMode()) {
      return;
    }

    if (this.form.valid) {
      const formData = this.form.value;

      if (this.tipo === 'sign-up' && this.firebaseAuth.hasPendingGoogleRegistration()) {
        void this.completePendingGoogleRegistration(formData);
        return;
      }
      
      // Filtrar datos según el tipo de formulario
      if (this.tipo === 'contacto') {
        // Para contacto, solo enviar campos necesarios
        const contactoData = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          telefono: formData.telefono,
          asunto: formData.asunto,
          mensaje: formData.mensaje
        };
        console.log('Datos de contacto filtrados:', contactoData);
        this.formSubmit.emit(contactoData);
      } else if (this.tipo === 'sign-in') {
        // Para login, solo email y password
        const loginData = {
          email: formData.email,
          clave: formData.clave
        };
        this.formSubmit.emit(loginData);
      } else {
        // Para otros tipos (registro, crear, editar), enviar todo
        this.formSubmit.emit(formData);
      }
    }
  }

  private async completePendingGoogleRegistration(formData: any): Promise<void> {
    this.googleLoading = true;

    try {
      const result = await this.firebaseAuth.completePendingGoogleRegistration({
        nombre: formData.nombre,
        apellido: formData.apellido,
        edad: formData.edad,
        telefono: formData.telefono,
        dni: formData.dni
      });

      if (result.success) {
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });

        this.formSubmit.emit({
          success: true,
          user: result.user,
          message: result.message,
          provider: 'google',
          autoLogin: true
        });
      } else {
        if (result.prefillData) {
          this.form.patchValue({
            nombre: result.prefillData.nombre || formData.nombre,
            apellido: result.prefillData.apellido || formData.apellido,
            email: result.prefillData.email || formData.email,
            telefono: result.prefillData.telefono || formData.telefono,
            edad: result.prefillData.edad || formData.edad,
            dni: result.prefillData.dni || formData.dni,
          });
        }

        this.snackBar.open(result.message, 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    } catch (error) {
      console.error('Error completando registro pendiente de Google:', error);
      this.snackBar.open('No se pudo completar el registro con Google.', 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.googleLoading = false;
    }
  }

  onCancel() {
    if (this.firebaseAuth.hasPendingGoogleRegistration()) {
      this.firebaseAuth.clearPendingGoogleRegistration();
    }
    this.formCancel.emit();
  }

  getLoadingText() {
    switch (this.tipo) {
      case 'sign-in':
        return 'Iniciando sesión...';
      case 'sign-up':
        return 'Registrando...';
      case 'contacto':
        return 'Enviando consulta...';
      case 'crear':
        return 'Creando usuario...';
      case 'editar':
        return 'Guardando cambios...';
      default:
        return 'Procesando...';
    }
  }

  getSubmitButtonText() {
    switch (this.tipo) {
      case 'sign-in':
        return 'Iniciar Sesión';
      case 'sign-up':
        return 'Registrarse';
      case 'contacto':
        return 'Enviar Consulta';
      case 'crear':
        return 'Crear Usuario';
      case 'editar':
        return 'Guardar Cambios';
      case 'detalle':
        return 'Cerrar'; // No debería mostrarse
      default:
        return 'Aceptar';
    }
  }

  switchToRegister() {
    this.modeChange.emit('register');
  }

  switchToLogin() {
    if (this.firebaseAuth.hasPendingGoogleRegistration()) {
      this.firebaseAuth.clearPendingGoogleRegistration();
    }
    this.modeChange.emit('login');
  }

  /**
   * Maneja el login/registro con Google
   */
  async signWithGoogle() {
    this.googleLoading = true;

    try {
      const result = await this.firebaseAuth.signInWithGoogle();
      
      console.log('🔥 Resultado Firebase Auth:', result);
      
      if (result.success) {
        // Notificar éxito
        const mensaje = this.tipo === 'sign-in' 
          ? '¡Inicio de sesión exitoso con Google!' 
          : '¡Registro exitoso con Google!';
          
        this.snackBar.open(mensaje, 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });

        // Emitir el resultado del formulario para cerrar el modal
        this.formSubmit.emit({
          success: true,
          user: result.user,
          message: mensaje,
          provider: 'google',
          autoLogin: true // Importante para que el modal sepa que se logueó automáticamente
        });
        
      } else if (result.requiresRegistration) {
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });

        if (this.tipo !== 'sign-up') {
          this.modeChange.emit('register');
        } else if (result.prefillData) {
          this.form.patchValue({
            nombre: result.prefillData.nombre || '',
            apellido: result.prefillData.apellido || '',
            email: result.prefillData.email || '',
            telefono: result.prefillData.telefono || '',
            edad: result.prefillData.edad || '',
            dni: result.prefillData.dni || '',
          });
        }
      } else {
        // Mostrar error
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    } catch (error) {
      console.error('💥 Error en autenticación con Google:', error);
      this.snackBar.open('Error al autenticarse con Google. Intenta nuevamente.', 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.googleLoading = false;
    }
  }
}
