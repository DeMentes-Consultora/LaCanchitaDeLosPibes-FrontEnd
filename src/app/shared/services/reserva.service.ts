import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ConfigService } from './config.service';

// Interface simplificada basada en la BD existente
export interface Reserva {
  id?: number;
  user_id: number;
  cancha_id: number;
  fecha: string; // YYYY-MM-DD format
  hora: string; // HH:mm format
  duracion: number;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
  total: number;
  comentarios?: string;
  created_at?: string;
  updated_at?: string;
  // Relaciones que vienen del JOIN en el Model
  cancha?: {
    id: number;
    nombre: string;
    precio: number;
  };
  usuario?: {
    id: number;
    nombre: string;
    email: string;
  };
}

export interface CrearReservaRequest {
  cancha_id: number;
  fecha: string;
  hora: string;
  comentarios?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);

  // Estado local para las reservas del usuario
  private reservasSubject = new BehaviorSubject<Reserva[]>([]);
  public reservas$ = this.reservasSubject.asObservable();

  constructor() {
    // Cargar reservas al inicializar si hay usuario autenticado
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        this.cargarMisReservas();
      } else {
        this.reservasSubject.next([]);
      }
    });
  }

  /**
   * Crear una nueva reserva usando el sistema existente
   */
  crearReserva(reservaData: CrearReservaRequest): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser?.id_usuario) {
      throw new Error('Usuario no autenticado');
    }

    // Usar el controlador existente que ya maneja la estructura normalizada
    const payload = {
      id_usuario: currentUser.id_usuario,
      cancha: reservaData.cancha_id,
      fecha: reservaData.fecha,
      horario: reservaData.hora,
      comentarios: reservaData.comentarios || ''
    };

    return this.http.post(this.configService.getApiEndpoint('reservarCancha'), payload).pipe(
      map((response: any) => {
        return response;
      })
    );
  }

  /**
   * Obtener todas las reservas del usuario autenticado
   * Usa el modelo Reserva.php existente
   */
  cargarMisReservas(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser?.id_usuario) {
      this.reservasSubject.next([]);
      return;
    }

    // Usaremos un endpoint que aproveche Reserva::listarTodas() filtrado por usuario
    const url = `${this.configService.apiUrl}/reservas.php?id_usuario=${currentUser.id_usuario}`;
    
    this.http.get<any[]>(url)
      .pipe(
        map(reservasDB => this.convertirReservasAFrontend(reservasDB))
      )
      .subscribe({
        next: (reservas) => {
          this.reservasSubject.next(reservas);
        },
        error: (_error: unknown) => {
          this.reservasSubject.next([]);
        }
      });
  }

  // Convertir datos de BD (del Model/Reserva.php) a formato frontend
  private convertirReservasAFrontend(reservasDB: any[]): Reserva[] {
    return reservasDB.map(reserva => ({
      id: reserva.id_reserva,
      user_id: reserva.id_usuario,
      cancha_id: reserva.id_cancha,
      fecha: reserva.fecha,
      hora: reserva.horario,
      duracion: 1, // Por defecto 1 hora
      estado: reserva.cancelado ? 'cancelada' : 'confirmada',
      total: reserva.precio || 0,
      created_at: reserva.idCreate,
      updated_at: reserva.idUpdate,
      cancha: {
        id: reserva.id_cancha,
        nombre: reserva.nombreCancha || 'Cancha',
        precio: reserva.precio || 0
      },
      usuario: {
        id: reserva.id_usuario,
        nombre: `${reserva.nombre || ''} ${reserva.apellido || ''}`.trim(),
        email: reserva.email || ''
      }
    }));
  }

  /**
   * Cancelar una reserva
   */
  cancelarReserva(id: number, motivo?: string): Observable<any> {
    // Usaremos un endpoint simple para cancelar
    return this.http.put(this.configService.getApiEndpoint('cancelar-reserva'), { 
      id_reserva: id,
      motivo 
    });
  }

  /**
   * Filtrar reservas por rango de fechas
   */
  filtrarReservasPorFecha(fechaInicio?: string, fechaFin?: string): Reserva[] {
    const reservas = this.reservasSubject.value;
    
    if (!fechaInicio && !fechaFin) {
      return reservas;
    }

    return reservas.filter(reserva => {
      const fechaReserva = new Date(reserva.fecha);
      
      if (fechaInicio && fechaReserva < new Date(fechaInicio)) {
        return false;
      }
      
      if (fechaFin && fechaReserva > new Date(fechaFin)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Obtener estadísticas básicas del usuario (calculadas localmente)
   */
  obtenerEstadisticasUsuario(): Observable<{
    total_reservas: number;
    reservas_confirmadas: number;
    reservas_canceladas: number;
    total_gastado: number;
  }> {
    const reservas = this.reservasSubject.value;
    
    const stats = {
      total_reservas: reservas.length,
      reservas_confirmadas: reservas.filter(r => r.estado === 'confirmada').length,
      reservas_canceladas: reservas.filter(r => r.estado === 'cancelada').length,
      total_gastado: reservas.reduce((total, r) => total + r.total, 0)
    };
    
    return new Observable(observer => {
      observer.next(stats);
      observer.complete();
    });
  }
}
