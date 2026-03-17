import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../shared/services/auth.service';
import { ReservaService, CrearReservaRequest } from '../../shared/services/reserva.service';
import { CanchaHorarioService, CanchaDB, HorarioDB } from '../../shared/services/cancha-horario.service';

@Component({
  selector: 'app-nueva-reserva',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatSnackBarModule
  ],
  template: `
    <div class="nueva-reserva-container">
      <div class="header">
        <button mat-icon-button (click)="volver()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Nueva Reserva</h1>
      </div>

      <mat-card class="reserva-card">
        <mat-horizontal-stepper #stepper>
          <!-- Paso 1: Selección de cancha -->
          <mat-step [stepControl]="canchaForm">
            <form [formGroup]="canchaForm">
              <ng-template matStepLabel>Seleccionar Cancha</ng-template>
              
              <div class="step-content">
                <h3>Información de la cancha</h3>
                
                @if (canchaSeleccionada) {
                  <div class="cancha-info">
                    <div class="cancha-details">
                      <img [src]="canchaSeleccionada.imagen" [alt]="canchaSeleccionada.nombre" class="cancha-imagen">
                      <div class="details">
                        <h4>{{ canchaSeleccionada.nombre }}</h4>
                        <p>{{ canchaSeleccionada.tipo }}</p>
                        <p>{{ canchaSeleccionada.descripcion }}</p>
                        <div class="precio-info">
                          <strong>\${{ canchaSeleccionada.precio }}/hora</strong>
                        </div>
                      </div>
                    </div>
                    @if (!mostrarSelectorCancha && canchasDisponibles.length > 1) {
                      <div class="cancha-actions">
                        <button mat-button type="button" (click)="cambiarCancha()">
                          Cambiar cancha
                        </button>
                      </div>
                    }
                  </div>
                }

                @if (!canchaSeleccionada || mostrarSelectorCancha) {
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Cancha</mat-label>
                    <mat-select formControlName="canchaId" (selectionChange)="onCanchaChange($event.value)">
                      @for (cancha of canchasDisponibles; track cancha.id) {
                        <mat-option [value]="cancha.id">
                          {{ cancha.nombre }} - {{ cancha.tipo }} (\${{ cancha.precio }}/hora)
                        </mat-option>
                      }
                    </mat-select>
                    @if (canchaForm.get('canchaId')?.hasError('required')) {
                      <mat-error>
                        Por favor selecciona una cancha
                      </mat-error>
                    }
                  </mat-form-field>
                }

                <div class="step-actions">
                  <button mat-raised-button color="primary" matStepperNext [disabled]="!canchaForm.valid">
                    Siguiente
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- Paso 2: Fecha y hora -->
          <mat-step [stepControl]="fechaForm">
            <form [formGroup]="fechaForm">
              <ng-template matStepLabel>Fecha y Hora</ng-template>
              
              <div class="step-content">
                <h3>¿Cuándo quieres jugar?</h3>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Fecha</mat-label>
                  <input matInput [matDatepicker]="picker" formControlName="fecha" [min]="fechaMinima">
                  <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                  <mat-datepicker #picker></mat-datepicker>
                  @if (fechaForm.get('fecha')?.hasError('required')) {
                    <mat-error>
                      Por favor selecciona una fecha
                    </mat-error>
                  }
                </mat-form-field>

                <div class="horarios-grid">
                  <h4>Horarios disponibles</h4>
                  <div class="horarios-lista">
                    @for (horario of horariosDisponibles; track horario.hora) {
                      <button 
                        mat-stroked-button
                        [class.selected]="horario.hora === fechaForm.get('hora')?.value"
                        [disabled]="!horario.disponible"
                        (click)="seleccionarHorario(horario.hora)"
                        class="horario-btn">
                        {{ horario.hora }}
                        @if (!horario.disponible) {
                          <span class="ocupado">(Ocupado)</span>
                        }
                      </button>
                    }
                  </div>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Duración (horas)</mat-label>
                  <mat-select formControlName="duracion">
                    <mat-option value="1">1 hora</mat-option>
                    <mat-option value="1.5">1.5 horas</mat-option>
                    <mat-option value="2">2 horas</mat-option>
                    <mat-option value="3">3 horas</mat-option>
                  </mat-select>
                </mat-form-field>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Atrás</button>
                  <button mat-raised-button color="primary" matStepperNext [disabled]="!fechaForm.valid">
                    Siguiente
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- Paso 3: Datos del cliente -->
          <mat-step [stepControl]="clienteForm">
            <form [formGroup]="clienteForm">
              <ng-template matStepLabel>Datos del Cliente</ng-template>
              
              <div class="step-content">
                <h3>Confirma tus datos</h3>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Nombre</mat-label>
                    <input matInput formControlName="nombre">
                    @if (clienteForm.get('nombre')?.hasError('required')) {
                      <mat-error>
                        El nombre es requerido
                      </mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Apellido</mat-label>
                    <input matInput formControlName="apellido">
                    @if (clienteForm.get('apellido')?.hasError('required')) {
                      <mat-error>
                        El apellido es requerido
                      </mat-error>
                    }
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Teléfono</mat-label>
                  <input matInput formControlName="telefono" type="tel">
                  @if (clienteForm.get('telefono')?.hasError('required')) {
                    <mat-error>
                      El teléfono es requerido
                    </mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" type="email">
                  @if (clienteForm.get('email')?.hasError('required')) {
                    <mat-error>
                      El email es requerido
                    </mat-error>
                  }
                  @if (clienteForm.get('email')?.hasError('email')) {
                    <mat-error>
                      Ingresa un email válido
                    </mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Comentarios adicionales</mat-label>
                  <textarea matInput formControlName="comentarios" rows="3" placeholder="Equipamiento especial, servicios adicionales, etc."></textarea>
                </mat-form-field>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Atrás</button>
                  <button mat-raised-button color="primary" matStepperNext [disabled]="!clienteForm.valid">
                    Siguiente
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- Paso 4: Confirmación -->
          <mat-step>
            <ng-template matStepLabel>Confirmación</ng-template>
            
            <div class="step-content">
              <h3>Resumen de tu reserva</h3>
              
              <div class="resumen-reserva">
                <div class="resumen-item">
                  <mat-icon>sports_soccer</mat-icon>
                  <div>
                    <strong>Cancha:</strong> {{ canchaSeleccionada?.nombre }} - {{ canchaSeleccionada?.tipo }}
                  </div>
                </div>

                <div class="resumen-item">
                  <mat-icon>event</mat-icon>
                  <div>
                    <strong>Fecha:</strong> {{ fechaForm.get('fecha')?.value | date:'fullDate':'es' }}
                  </div>
                </div>

                <div class="resumen-item">
                  <mat-icon>schedule</mat-icon>
                  <div>
                    <strong>Horario:</strong> {{ fechaForm.get('hora')?.value }} ({{ fechaForm.get('duracion')?.value }}h)
                  </div>
                </div>

                <div class="resumen-item">
                  <mat-icon>person</mat-icon>
                  <div>
                    <strong>Cliente:</strong> {{ clienteForm.get('nombre')?.value }} {{ clienteForm.get('apellido')?.value }}
                  </div>
                </div>

                <div class="resumen-item">
                  <mat-icon>phone</mat-icon>
                  <div>
                    <strong>Teléfono:</strong> {{ clienteForm.get('telefono')?.value }}
                  </div>
                </div>

                <div class="total-precio">
                  <strong>Total: \${{ calcularTotal() }}</strong>
                </div>
              </div>

              <div class="step-actions">
                <button mat-button matStepperPrevious>Atrás</button>
                <button 
                  mat-raised-button 
                  color="primary" 
                  (click)="confirmarReserva()"
                  [disabled]="procesandoReserva">
                  @if (procesandoReserva) {
                    <mat-icon>hourglass_empty</mat-icon>
                  }
                  {{ procesandoReserva ? 'Procesando...' : 'Confirmar Reserva' }}
                </button>
              </div>
            </div>
          </mat-step>
        </mat-horizontal-stepper>
      </mat-card>
    </div>
  `,
  styles: [`
    .nueva-reserva-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
    }

    .header h1 {
      margin: 0;
      color: #2e7d32;
    }

    .reserva-card {
      padding: 24px;
    }

    .step-content {
      margin: 24px 0;
    }

    .step-content h3 {
      margin-bottom: 24px;
      color: #333;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .cancha-info {
      margin-bottom: 24px;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .cancha-details {
      display: flex;
      gap: 16px;
    }

    .cancha-imagen {
      width: 120px;
      height: 80px;
      object-fit: cover;
      border-radius: 8px;
    }

    .details h4 {
      margin: 0 0 8px 0;
      color: #2e7d32;
    }

    .precio-info {
      margin-top: 8px;
      font-size: 1.2rem;
      color: #2e7d32;
    }

    .cancha-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .horarios-grid {
      margin: 24px 0;
    }

    .horarios-lista {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 8px;
      margin-top: 16px;
    }

    .horario-btn {
      height: 48px;
    }

    .horario-btn.selected {
      background-color: #2e7d32;
      color: white;
    }

    .ocupado {
      font-size: 0.8rem;
      color: #f44336;
    }

    .step-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 32px;
    }

    .resumen-reserva {
      background: #f9f9f9;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .resumen-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .resumen-item mat-icon {
      color: #2e7d32;
    }

    .total-precio {
      text-align: center;
      font-size: 1.5rem;
      color: #2e7d32;
      border-top: 1px solid #e0e0e0;
      padding-top: 16px;
      margin-top: 24px;
    }
  `]
})
export class NuevaReservaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private reservaService = inject(ReservaService);
  private canchaHorarioService = inject(CanchaHorarioService);
  private snackBar = inject(MatSnackBar);

  canchaForm!: FormGroup;
  fechaForm!: FormGroup;
  clienteForm!: FormGroup;

  canchaSeleccionada: any = null;
  mostrarSelectorCancha = false;
  fechaMinima = new Date();
  procesandoReserva = false;

  // Datos reales desde la base de datos
  canchasDisponibles: any[] = [];
  horariosDisponibles: any[] = [];

  ngOnInit() {
    this.initializeForms();
    this.loadCanchas();
    this.loadHorarios();
    this.checkCanchaFromParams();
    this.loadUserData();
  }

  initializeForms() {
    this.canchaForm = this.fb.group({
      canchaId: ['', Validators.required]
    });

    this.fechaForm = this.fb.group({
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      duracion: [1, Validators.required]
    });

    this.clienteForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      telefono: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      comentarios: ['']
    });
  }

  loadCanchas() {
    this.canchaHorarioService.getCanchas().subscribe({
      next: (canchas: CanchaDB[]) => {
        this.canchasDisponibles = canchas.map(cancha => ({
          id: cancha.id_cancha,
          nombre: cancha.nombreCancha,
          tipo: 'Fútbol', // Se puede determinar desde el nombre
          descripcion: `Cancha ${cancha.nombreCancha}`,
          precio: cancha.precio,
          imagen: 'assets/images/cancha-default.svg'
        }));
        // Si ya hay un canchaId en el form (vino de queryParams antes de que cargaran las canchas), aplicar la selección ahora
        const canchaId = this.canchaForm.get('canchaId')?.value;
        if (canchaId) {
          this.onCanchaChange(Number(canchaId));
        }
      },
      error: (error: any) => {
        console.error('Error al cargar canchas:', error);
        this.snackBar.open('Error al cargar las canchas disponibles', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  loadHorarios() {
    this.canchaHorarioService.getHorarios().subscribe({
      next: (horarios: HorarioDB[]) => {
        this.horariosDisponibles = horarios.map(horario => ({
          hora: this.canchaHorarioService.formatearHorario(horario.horario),
          disponible: true // Inicialmente todos disponibles, se puede verificar disponibilidad después
        }));
      },
      error: (error: any) => {
        console.error('Error al cargar horarios:', error);
        // Mantener horarios por defecto si hay error
        this.horariosDisponibles = [
          { hora: '08:00', disponible: true },
          { hora: '09:00', disponible: true },
          { hora: '10:00', disponible: true },
          { hora: '11:00', disponible: true },
          { hora: '12:00', disponible: true },
          { hora: '13:00', disponible: true },
          { hora: '14:00', disponible: true },
          { hora: '15:00', disponible: true },
          { hora: '16:00', disponible: true },
          { hora: '17:00', disponible: true },
          { hora: '18:00', disponible: true },
          { hora: '19:00', disponible: true },
          { hora: '20:00', disponible: true },
          { hora: '21:00', disponible: true }
        ];
      }
    });
  }

  checkCanchaFromParams() {
    this.route.queryParams.subscribe(params => {
      if (params['canchaId']) {
        const canchaId = parseInt(params['canchaId']);
        this.canchaForm.patchValue({ canchaId });
        // Si las canchas ya cargaron, aplicar la selección inmediatamente
        // Si no, loadCanchas() lo hará al completar la carga
        if (this.canchasDisponibles.length > 0) {
          this.onCanchaChange(canchaId);
        }
      }
    });
  }

  loadUserData() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.clienteForm.patchValue({
        nombre: currentUser.nombre || '',
        apellido: currentUser.apellido || '',
        email: currentUser.email || ''
      });
    }
  }

  onCanchaChange(canchaId: number) {
    this.canchaSeleccionada = this.canchasDisponibles.find(c => c.id === canchaId);

    if (this.canchaSeleccionada) {
      this.mostrarSelectorCancha = false;
    }
  }

  cambiarCancha() {
    this.mostrarSelectorCancha = true;
  }

  seleccionarHorario(hora: string) {
    this.fechaForm.patchValue({ hora });
  }

  calcularTotal(): number {
    if (!this.canchaSeleccionada) return 0;
    
    const duracion = this.fechaForm.get('duracion')?.value || 1;
    return this.canchaSeleccionada.precio * duracion;
  }

  async confirmarReserva() {
    if (!this.canchaForm.valid || !this.fechaForm.valid || !this.clienteForm.valid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.procesandoReserva = true;

    try {
      // Preparar datos para enviar al backend
      const reservaData: CrearReservaRequest = {
        cancha_id: this.canchaForm.value.canchaId,
        fecha: this.fechaForm.value.fecha.toISOString().split('T')[0], // YYYY-MM-DD
        hora: this.fechaForm.value.hora,
        comentarios: this.clienteForm.value.comentarios
      };

      console.log('Enviando reserva:', reservaData);
      
      // Validar que el usuario esté autenticado
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        this.snackBar.open('Debes iniciar sesión para hacer una reserva', 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.router.navigate(['/auth/login']);
        return;
      }

      // Llamar al servicio para crear la reserva
      await this.reservaService.crearReserva(reservaData).toPromise();

      this.snackBar.open('¡Reserva confirmada exitosamente!', 'Cerrar', {
        duration: 5000,
        panelClass: ['success-snackbar']
      });

      // Recargar las reservas del usuario
      this.reservaService.cargarMisReservas();

      // Redirigir a la lista de reservas del usuario
      this.router.navigate(['/dashboard/mis-reservas']);

    } catch (error: any) {
      console.error('Error al confirmar reserva:', error);
      
      let mensaje = 'Error al procesar la reserva. Intenta nuevamente.';
      
      if (error?.error?.message) {
        mensaje = error.error.message;
      } else if (error?.message) {
        mensaje = error.message;
      }

      this.snackBar.open(mensaje, 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.procesandoReserva = false;
    }
  }

  volver() {
    this.router.navigate(['/reservas']);
  }
}
