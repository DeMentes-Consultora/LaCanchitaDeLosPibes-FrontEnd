import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CanchaAdmin } from '../../interfaces/cancha.interface';

export type CanchaFormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-canchas-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './canchas-form.component.html',
  styleUrls: ['./canchas-form.component.css']
})
export class CanchasFormComponent implements OnInit, OnChanges {
  @Input() mode: CanchaFormMode = 'create';
  @Input() cancha: CanchaAdmin | null = null;
  @Input() loading = false;
  @Output() formSubmit = new EventEmitter<any>();
  @Output() formCancel = new EventEmitter<void>();

  form: FormGroup;
  hidePassword = true;
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  // Opciones para el tipo de cancha
  tiposCancha = [
    { value: 'Fútbol 5', label: 'Fútbol 5' },
    { value: 'Fútbol 7', label: 'Fútbol 7' },
    { value: 'Fútbol 11', label: 'Fútbol 11' }
  ];

  // Opciones para el estado
  estadosCancha = [
    { value: 1, label: 'Habilitada' },
    { value: 0, label: 'Deshabilitada' }
  ];

  constructor(private fb: FormBuilder) {
    // Inicializar el formulario con todos los campos
    this.form = this.fb.group({
      nombre: [''],
      tipo: [''],
      descripcion: [''],
      precio: [0],
      habilitado: [1]
    });
  }

  ngOnInit() {
    this.setupFormValidations();
    
    // Cargar datos de la cancha después de configurar las validaciones
    if (this.cancha) {
      this.form.patchValue({
        nombre: this.cancha.nombre,
        tipo: this.cancha.tipo,
        descripcion: this.cancha.descripcion,
        precio: this.cancha.precio,
        habilitado: this.cancha.estado === 'Habilitada' ? 1 : 0
      });
      this.imagePreviewUrl = this.cancha.foto_cancha_url || null;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mode'] && !changes['mode'].firstChange) {
      this.setupFormValidations();
    }

    if (changes['cancha'] && this.cancha) {
      this.imagePreviewUrl = this.cancha.foto_cancha_url || null;
    }
  }

  /**
   * Determina si todos los campos deben estar deshabilitados (solo lectura)
   */
  isReadOnlyMode(): boolean {
    return this.mode === 'view';
  }

  private setupFormValidations() {
    // En modo solo lectura, no aplicar validaciones
    const isReadOnly = this.isReadOnlyMode();
    
    // Validaciones generales (solo si no es modo de solo lectura)
    const requiredValidator = isReadOnly ? [] : [Validators.required];
    const priceValidators = isReadOnly ? [] : [Validators.required, Validators.min(1)];
    
    // Validar todos los campos para creación/edición
    this.form = this.fb.group({
      nombre: ['', requiredValidator],
      tipo: ['', requiredValidator],
      descripcion: [''],
      precio: [0, priceValidators],
      habilitado: [1, requiredValidator]
    });

    // Si hay una cancha, cargar sus datos
    if (this.cancha) {
      this.form.patchValue({
        nombre: this.cancha.nombre,
        tipo: this.cancha.tipo,
        descripcion: this.cancha.descripcion,
        precio: this.cancha.precio,
        habilitado: this.cancha.estado === 'Habilitada' ? 1 : 0
      });
    }
  }

  onSubmit() {
    // Prevenir envío en modo de solo lectura
    if (this.isReadOnlyMode()) {
      return;
    }

    if (this.form.valid) {
      const formData = {
        ...this.form.value,
        foto_cancha_file: this.selectedImageFile,
        foto_cancha_url: this.cancha?.foto_cancha_url || null,
        foto_cancha_public_id: this.cancha?.foto_cancha_public_id || null,
        // Agregar campos adicionales si estamos editando
        ...(this.mode === 'edit' && this.cancha ? {
          id_cancha: this.cancha.idCancha,
          idCancha: this.cancha.idCancha
        } : {})
      };
      this.formSubmit.emit(formData);
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      input.value = '';
      return;
    }

    this.selectedImageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreviewUrl = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  clearSelectedImage(fileInput: HTMLInputElement): void {
    this.selectedImageFile = null;
    this.imagePreviewUrl = this.cancha?.foto_cancha_url || null;
    fileInput.value = '';
  }

  onCancel() {
    this.formCancel.emit();
  }

  getLoadingText() {
    switch (this.mode) {
      case 'create':
        return 'Creando cancha...';
      case 'edit':
        return 'Guardando cambios...';
      default:
        return 'Procesando...';
    }
  }

  getSubmitButtonText() {
    switch (this.mode) {
      case 'create':
        return 'Crear Cancha';
      case 'edit':
        return 'Guardar Cambios';
      case 'view':
        return 'Cerrar'; // No debería mostrarse
      default:
        return 'Guardar';
    }
  }
}
