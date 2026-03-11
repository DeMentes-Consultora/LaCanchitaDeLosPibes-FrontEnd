import { Component, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '@shared/services/auth.service';
import { FirebaseAuthService } from '@shared/services/firebase-auth.service';
import { UsuariosModalComponent } from '@shared/components/usuarios-modal/usuarios-modal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent {
  loading = signal(false);
  error = signal('');
  form;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private authService: AuthService,
    private firebaseAuth: FirebaseAuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  /**
   * Abrir modal de login
   */
  openLoginModal() {
    const dialogRef = this.dialog.open(UsuariosModalComponent, {
      width: '400px',
      disableClose: false,
      data: {
        mode: 'login',
        title: 'Iniciar Sesión'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.snackBar.open('¡Bienvenido!', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        // Redirigir al dashboard después del login exitoso
        this.router.navigate(['/dashboard']);
      }
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.loading.set(true);
      // Simula login
      setTimeout(() => {
        this.loading.set(false);
        this.error.set('');
      }, 1000);
    }
  }

  /**
   * Iniciar sesión con Google
   */
  async signInWithGoogle() {
    await this.signInWithProvider('google');
  }

  /**
   * Iniciar sesión con Facebook
   */
  async signInWithFacebook() {
    await this.signInWithProvider('facebook');
  }

  private async signInWithProvider(provider: 'google' | 'facebook') {
    try {
      this.loading.set(true);
      this.error.set('');

      const result = provider === 'google'
        ? await this.firebaseAuth.signInWithGoogle()
        : await this.firebaseAuth.signInWithFacebook();

      if (result.success) {
        this.snackBar.open(`¡Bienvenido! Inicio de sesión exitoso con ${provider === 'google' ? 'Google' : 'Facebook'}`, 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });

        // Redirigir al dashboard o página principal
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set(result.message);
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    } catch (error) {
      console.error('Error en autenticación social:', error);
      this.error.set('Error inesperado al iniciar sesión');
      this.snackBar.open('Error inesperado al iniciar sesión', 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.loading.set(false);
    }
  }
}
