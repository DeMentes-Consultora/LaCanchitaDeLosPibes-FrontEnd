import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface CanchaDB {
  id_cancha: number;
  nombreCancha: string;
  precio: number;
  habilitado: number;
  cancelado: number;
}

export interface HorarioDB {
  id_horario: number;
  horario: string;
  habilitado: number;
  cancelado: number;
}

@Injectable({
  providedIn: 'root'
})
export class CanchaHorarioService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  /**
   * Obtener todas las canchas disponibles
   */
  getCanchas(): Observable<CanchaDB[]> {
    return this.http.get<CanchaDB[]>(this.configService.getApiEndpoint('canchas'));
  }

  /**
   * Obtener todos los horarios disponibles
   */
  getHorarios(): Observable<HorarioDB[]> {
    return this.http.get<HorarioDB[]>(this.configService.getApiEndpoint('horarios'));
  }

  /**
   * Convertir horario de formato TIME a string legible
   */
  formatearHorario(horario: string): string {
    // Convierte "08:00:00" a "08:00"
    return horario.substring(0, 5);
  }

  /**
   * Obtener precio de una cancha específica
   */
  getPrecioCancha(canchaId: number): Observable<number> {
    return new Observable(observer => {
      this.getCanchas().subscribe({
        next: (canchas) => {
          const cancha = canchas.find(c => c.id_cancha === canchaId);
          observer.next(cancha?.precio || 0);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }
}
