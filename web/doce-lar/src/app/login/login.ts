import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: '../auth.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

    protected async login(): Promise<void> {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }

      this.errorMessage.set('');
      this.isSubmitting.set(true);
      try {
        const { email, password } = this.form.getRawValue();
        await this.auth.login(email, password);
        await this.router.navigateByUrl(this.getReturnUrl());
      } catch (error) {
        this.errorMessage.set(
          error instanceof Error ? error.message : 'Não foi possível fazer login.',
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
