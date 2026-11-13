import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrl: '../auth.css',
})
export class Perfil {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    username: [this.auth.session()?.username ?? '', [Validators.required, Validators.minLength(2)]],
    full_name: [this.auth.session()?.fullName ?? '', [Validators.required, Validators.minLength(2)]],
    email: [this.auth.session()?.email ?? '', [Validators.required, Validators.email]],
  });

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isSubmitting.set(true);
    try {
      await this.auth.updateProfile(this.form.getRawValue());
      this.successMessage.set('Perfil atualizado com sucesso.');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Não foi possível atualizar o perfil.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/');
  }
}
