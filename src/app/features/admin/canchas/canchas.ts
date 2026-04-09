import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TablaComponent } from '@shared/components/tabla/tabla';
import { CanchasModalComponent } from '@shared/components/canchas-modal/canchas-modal.component';
import { CanchaAdmin } from '@shared/interfaces/cancha.interface';
import { CanchasService } from '@shared/services/canchas.service';

/**
 * Interfaz para las acciones de la tabla de canchas.
 * Cada acción tiene un icono, tooltip, color y una función callback.
 */
interface CanchaAction {
  icon: string;
  tooltip: string;
  color?: string;
  callback: (row: CanchaAdmin) => void;
}

@Component({
  selector: 'app-canchas',
  standalone: true,
  imports: [
    CommonModule, 
    TablaComponent, 
    MatButtonModule, 
    MatIconModule, 
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './canchas.html',
  styleUrls: ['./canchas.css']
})
export class CanchasComponent implements OnInit {
  private dialog = inject(MatDialog);
  private canchasService = inject(CanchasService);
  private snackBar = inject(MatSnackBar);

  // Encabezados de la tabla (deben coincidir con las claves de CanchaAdmin)
  headers = ['foto', 'nombre', 'tipo', 'precio', 'estado'];

  // Datos de canchas cargados desde el backend
  canchas: CanchaAdmin[] = [];
  isLoading = true;

  // Acciones para cada fila de la tabla
  canchaActions: CanchaAction[] = [
    { icon: 'visibility', tooltip: 'Ver detalle', color: 'primary', callback: (row: CanchaAdmin) => this.abrirDetalle(row) },
    { icon: 'edit', tooltip: 'Modificar', color: 'accent', callback: (row: CanchaAdmin) => this.abrirModificar(row) },
    { icon: 'toggle_on', tooltip: 'Cambiar estado', color: 'warn', callback: (row: CanchaAdmin) => this.toggleEstado(row) },
    { icon: 'delete', tooltip: 'Eliminar', color: 'warn', callback: (row: CanchaAdmin) => this.eliminarCancha(row) }
  ];

  ngOnInit() {
    this.cargarCanchas();
  }

  /**
   * Actualiza una cancha específica en el array local sin hacer petición al servidor
   */
  private actualizarCanchaLocal(canchaOriginal: CanchaAdmin, datosActualizados: any) {
    const index = this.canchas.findIndex(c => c.idCancha === canchaOriginal.idCancha);
    if (index !== -1) {
      // Actualizar solo los campos que han cambiado
      this.canchas[index] = {
        ...this.canchas[index],
        foto: this.canchas[index].foto,
        nombre: datosActualizados.nombre || canchaOriginal.nombre,
        tipo: datosActualizados.tipo || canchaOriginal.tipo,
        descripcion: datosActualizados.descripcion || canchaOriginal.descripcion,
        precio: datosActualizados.precio || canchaOriginal.precio,
        estado: datosActualizados.habilitado === 1 ? 'Habilitada' : 'Deshabilitada'
      };
      console.log('Cancha actualizada localmente:', this.canchas[index]);
    }
  }

  /**
   * Carga la lista de canchas desde el backend
   */
  cargarCanchas(forceRefresh = false) {
    console.log('Cargando canchas...', forceRefresh ? '(forzar actualización)' : '(usar cache si disponible)');
    this.isLoading = true;
    this.canchasService.getCanchasAdmin().subscribe({
      next: (canchas: CanchaAdmin[]) => {
        console.log('Respuesta de canchas:', canchas);
        this.canchas = canchas;
        console.log('Canchas cargadas:', this.canchas.length);
      },
      error: (error) => {
        console.error('Error al cargar canchas:', error);
        this.mostrarError('Error al conectar con el servidor');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Abre el modal para ver detalles de la cancha
   */
  abrirDetalle(cancha: CanchaAdmin) {
    const modalData = {
      mode: 'view' as const,
      cancha: cancha
    };

    const dialogRef = this.dialog.open(CanchasModalComponent, {
      width: '600px',
      data: modalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.refresh) {
        this.cargarCanchas();
      }
    });
  }

  /**
   * Abre el modal para modificar cancha
   */
  abrirModificar(cancha: CanchaAdmin) {
    const modalData = {
      mode: 'edit' as const,
      cancha: cancha
    };

    const dialogRef = this.dialog.open(CanchasModalComponent, {
      width: '600px',
      data: modalData
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Modal cerrado con resultado:', result);
      if (result?.success && result?.data) {
        console.log('✅ Actualización exitosa - usando cache optimizado');
        this.actualizarCanchaLocal(cancha, result.data);
        this.mostrarExito('Cancha modificada exitosamente');
      } else if (result?.refresh) {
        console.log('⚠️ Actualizando desde servidor por error');
        this.cargarCanchas(true);
        this.mostrarExito('Cancha modificada exitosamente');
      }
    });
  }

  /**
   * Cambia el estado de una cancha (habilitada/deshabilitada)
   */
  toggleEstado(cancha: CanchaAdmin) {
    const nuevoEstado = cancha.estado === 'Habilitada' ? 'Deshabilitada' : 'Habilitada';
    const confirmacion = confirm(`¿Estás seguro de ${nuevoEstado.toLowerCase()} la cancha "${cancha.nombre}"?`);
    
    if (confirmacion) {
      const habilitado = nuevoEstado === 'Habilitada';
      this.canchasService.toggleCanchaEstado(cancha.idCancha, habilitado).subscribe({
        next: (response) => {
          if (response.success) {
            // Actualizar localmente
            const index = this.canchas.findIndex(c => c.idCancha === cancha.idCancha);
            if (index !== -1) {
              this.canchas[index].estado = nuevoEstado as 'Habilitada' | 'Deshabilitada' | 'Cancelada';
            }
            this.mostrarExito(`Cancha ${nuevoEstado.toLowerCase()} exitosamente`);
          } else {
            this.mostrarError(response.message || 'Error al cambiar estado de la cancha');
          }
        },
        error: (error) => {
          console.error('Error al cambiar estado:', error);
          this.mostrarError('Error al cambiar estado de la cancha');
        }
      });
    }
  }

  /**
   * Elimina una cancha con confirmación
   */
  eliminarCancha(cancha: CanchaAdmin) {
    const confirmacion = confirm(`¿Estás seguro de eliminar la cancha "${cancha.nombre}"?\n\nEsta acción no se puede deshacer.`);
    
    if (confirmacion) {
      this.canchasService.deleteCancha(cancha.idCancha).subscribe({
        next: (response) => {
          if (response.success) {
            this.cargarCanchas();
            this.mostrarExito('Cancha eliminada exitosamente');
          } else {
            this.mostrarError(response.message || 'Error al eliminar cancha');
          }
        },
        error: (error) => {
          console.error('Error al eliminar cancha:', error);
          this.mostrarError('Error al eliminar cancha');
        }
      });
    }
  }

  /**
   * Abre el modal para crear nueva cancha
   */
  crearNuevaCancha() {
    const dialogRef = this.dialog.open(CanchasModalComponent, {
      width: '600px',
      data: {
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.refresh || result?.success) {
        this.cargarCanchas();
        this.mostrarExito('Cancha creada exitosamente');
      }
    });
  }

  /**
   * Muestra mensaje de éxito
   */
  private mostrarExito(mensaje: string) {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Muestra mensaje de error
   */
  private mostrarError(mensaje: string) {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
