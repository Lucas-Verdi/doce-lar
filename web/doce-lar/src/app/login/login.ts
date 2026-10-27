import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: '../auth.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected login() {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      void this.enviarLogin();
    }
  
    private async enviarLogin() {
      const { email, password } = this.form.value;
      try {
        const response = await fetch(`${environment.apiUrl}/api/user_login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
          throw new Error('Falha ao fazer login');
        }
      } catch (error) {
        console.error(error);
      }
    }
  }
