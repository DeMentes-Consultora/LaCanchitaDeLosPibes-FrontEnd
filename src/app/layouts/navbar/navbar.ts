import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { UsuariosModalComponent } from '../../shared/components/usuarios-modal/usuarios-modal.component';
import { AuthService } from '../../shared/services/auth.service';
import { SidenavService } from '../../shared/services/sidenav.service';
import { User } from '../../shared/interfaces/auth.interface';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, CommonModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit, OnDestroy {

  // Estado de autenticación
  currentUser: User | null = null;
  isAuthenticated = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private authService: AuthService,
    private sidenavService: SidenavService,
    private snackBar: MatSnackBar
  ) {}

  openSidenav() {
    this.sidenavService.toggle();
  }

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

    dialogRef.afterClosed().subscribe();
  }

  openRegisterModal() {
    const dialogRef = this.dialog.open(UsuariosModalComponent, {
      width: '500px',
      data: {
        mode: 'register',
        currentUser: this.currentUser
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        if (result.autoLogin) {
          // Si el auto-login fue exitoso, mostrar mensaje de bienvenida
          this.snackBar.open(result.message, 'Cerrar', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          // El navbar se actualizará automáticamente por el observable del authService
        } else {
          // Si el registro fue exitoso pero no se pudo hacer auto-login
          this.snackBar.open(result.message, 'Cerrar', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
        }
      }
    });
  }

  logout() {
    this.authService.logoutAndRedirect();
  }

  getUserDisplayName(): string {
    if (this.currentUser) {
      // Usar nombre y apellido reales del backend
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
      
      return 'Usuario';
    }
    return '';
  }

  getUserPhotoUrl(): string | null {
    if (!this.currentUser) {
      return null;
    }

    const user = this.currentUser as User & { foto_perfil_url?: string };
    const photo = (user.photoURL || user.foto_perfil_url || '').trim();

    return photo !== '' ? photo : null;
  }

  getAvatarText(): string {
    const fullName = this.getUserDisplayName().trim();
    if (fullName !== '' && fullName !== 'Usuario') {
      return fullName.charAt(0).toUpperCase();
    }

    const email = (this.currentUser?.email || '').trim();
    return email !== '' ? email.charAt(0).toUpperCase() : '?';
  }
}
