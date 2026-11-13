import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-recuperar-senha',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar-senha.html',
  styleUrl: '../auth.css',
})
export class RecuperarSenha {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  protected readonly message = signal('');
  protected readonly resetUrl = signal('');
  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected async request(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set('');
    this.message.set('');
    this.isSubmitting.set(true);
    try {
      const result = await this.auth.requestPasswordRecovery(this.form.getRawValue().email);
      this.message.set(result.message);
      this.resetUrl.set(
        result.reset_url
          ? new URL(result.reset_url, window.location.origin).toString()
          : '',
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Não foi possível solicitar a recuperação.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
