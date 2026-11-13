import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-redefinir-senha',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './redefinir-senha.html',
  styleUrl: '../auth.css',
})
export class RedefinirSenha {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmation: ['', Validators.required],
  });

  protected async reset(): Promise<void> {
    if (this.form.invalid || this.form.getRawValue().password !== this.form.getRawValue().confirmation) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Informe duas senhas iguais com pelo menos 6 caracteres.');
      return;
    }
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.errorMessage.set('O link de redefinição é inválido.');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);
    try {
      await this.auth.resetPassword(token, this.form.getRawValue().password);
      this.successMessage.set('Senha redefinida com sucesso. Você já pode fazer login.');
      setTimeout(() => void this.router.navigateByUrl('/login'), 1200);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Não foi possível redefinir a senha.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
