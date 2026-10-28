import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

function senhasIguais(group: AbstractControl) {
  const password = group.get('password')?.value;
  const confirmar = group.get('confirmar')?.value;
  return password === confirmar ? null : { senhasDiferentes: true };
}

@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cadastro.html',
  styleUrl: '../auth.css',
})
export class Cadastro {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required]],
      full_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: senhasIguais },
  );

  protected criarConta(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    void this.enviarCadastro();
  }

  private async enviarCadastro() {
    const { username, full_name, email, password } = this.form.getRawValue();
    this.errorMessage.set('');
    this.isSubmitting.set(true);
    try {
      await this.auth.register({ username, full_name, email, password });
      await this.router.navigateByUrl(this.getReturnUrl());
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Não foi possível criar a conta.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/';
  }
}
