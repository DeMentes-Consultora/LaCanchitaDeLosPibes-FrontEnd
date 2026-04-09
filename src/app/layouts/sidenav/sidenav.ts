import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { UsuariosModalComponent } from '../../shared/components/usuarios-modal/usuarios-modal.component';
import { AuthService } from '../../shared/services/auth.service';
import { PermissionsService } from '../../shared/services/permissions.service';
import { SidenavService } from '../../shared/services/sidenav.service';
import { User } from '../../shared/interfaces/auth.interface';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatDividerModule, RouterLink, CommonModule],
  templateUrl: './sidenav.html',
  styleUrls: ['./sidenav.css']
})
export class SidenavComponent implements OnInit, OnDestroy {

  // Estado de autenticación
  currentUser: User | null = null;
  isAuthenticated = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private sidenavService: SidenavService
  ) {}

  ngOnInit() {
    // Suscribirse al estado de autenticación
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.isAuthenticated = !!user;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openLoginModal() {
    const dialogRef = this.dialog.open(UsuariosModalComponent, {
      width: '450px',
      data: {
        mode: 'login'
      }
    });
  }

  openRegisterModal() {
    const dialogRef = this.dialog.open(UsuariosModalComponent, {
      width: '500px',
      data: {
        mode: 'register',
        currentUser: this.currentUser
      }
    });
  }

  logout() {
    this.authService.logoutAndRedirect();
  }

  closeSidenavPanel() {
    this.sidenavService.close();
  }

  getUserDisplayName(): string {
    if (this.currentUser) {
      const nombre = this.currentUser.nombre || '';
      const apellido = this.currentUser.apellido || '';
      
      if (nombre && apellido) {
        return `${nombre} ${apellido}`;
      } else if (nombre) {
        return nombre;
      } else if (this.currentUser.email) {
        // Solo como último recurso usar el email
        const emailUser = this.currentUser.email.split('@')[0];
        return emailUser;
      }
    }
    return 'Usuario';
  }

  getUserRole(): string {
    return this.currentUser?.nombre_rol || 'Usuario';
  }

  /**
   * Verificar si el usuario puede acceder a la sección de administración
   */
  canAccessAdmin(): boolean {
    return this.permissionsService.canAccessSection('admin');
  }

  /**
   * Verificar si el usuario puede acceder a la sección de bar
   */
  canAccessBar(): boolean {
    return this.permissionsService.canAccessSection('bar');
  }

  /**
   * Verificar si el usuario puede acceder a la sección de estacionamiento
   */
  canAccessEstacionamiento(): boolean {
    return this.permissionsService.canAccessSection('estacionamiento');
  }

  /**
   * Verificar si el usuario puede reservar canchas
   */
  canReserveCancha(): boolean {
    return this.permissionsService.canReserveCancha();
  }

  /**
   * Verificar si el usuario puede ver sus reservas
   */
  canViewReservations(): boolean {
    return this.permissionsService.canViewOwnReservations();
  }

  /**
   * Verificar si el usuario es administrador
   */
  isAdmin(): boolean {
    const role = this.currentUser?.nombre_rol;
    return role === 'Administrador';
  }

  /**
   * Verificar si el usuario es dueño
   */
  isDueno(): boolean {
    const role = this.currentUser?.nombre_rol;
    return role === 'Dueño';
  }

  /**
   * Verificar si el usuario es empleado
   */
  isEmpleado(): boolean {
    const role = this.currentUser?.nombre_rol;
    return role === 'Empleado';
  }

  /**
   * Verificar si el usuario es cliente
   */
  isCliente(): boolean {
    const role = this.currentUser?.nombre_rol;
    return role === 'Cliente';
  }

  /**
   * Verificar si el usuario tiene rol de Bar
   */
  isBar(): boolean {
    const role = this.currentUser?.nombre_rol;
    return role === 'Bar';
  }

  /**
   * Verificar si el usuario tiene rol de Estacionamiento
   */
  isEstacionamiento(): boolean {
    const role = this.currentUser?.nombre_rol;
    return role === 'Estacionamiento';
  }
}
