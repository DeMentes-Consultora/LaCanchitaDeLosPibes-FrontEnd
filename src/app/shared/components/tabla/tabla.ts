import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * Componente de tabla reutilizable.
 * Recibe encabezados, datos y acciones por @Input().
 */
@Component({
  selector: 'app-tabla',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './tabla.html',
  styleUrls: ['./tabla.css']
})
export class TablaComponent {
  /**
   * Encabezados de la tabla (deben coincidir con las claves de los objetos de data).
   * Ejemplo: ['idUsuario', 'apellido', ...]
   */
  @Input() headers: string[] = [];

  /**
   * Datos a mostrar en la tabla (array de objetos).
   * Ejemplo: [{ idUsuario: 1, apellido: 'Pérez', ... }, ...]
   */
  @Input() data: any[] = [];

  /**
   * Acciones para cada fila (array de objetos con icono, tooltip y callback).
   * Ejemplo: [{ icon: 'edit', tooltip: 'Editar', callback: (row) => ... }]
   */
  @Input() actions: { icon: string, tooltip: string, callback: (row: any) => void, color?: string }[] = [];

  /**
   * Claves de columna que deben renderizarse como miniatura de imagen.
   */
  @Input() imageHeaders: string[] = ['foto', 'imagen', 'preview', 'foto_cancha_url'];

  isImageHeader(header: string): boolean {
    return this.imageHeaders.includes(header);
  }

  getHeaderLabel(header: string): string {
    return header
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target.src.includes('cancha-default.svg')) {
      return;
    }

    target.src = 'assets/images/cancha-default.svg';
  }
}
