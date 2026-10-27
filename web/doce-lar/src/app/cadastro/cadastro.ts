import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

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

  protected readonly form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: senhasIguais },
  );

  protected criarConta() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    void this.enviarCadastro();
  }

  private async enviarCadastro() {
    const { username, email, password } = this.form.value;
    try {
      const response = await fetch('http://localhost:8000/create_account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      if (!response.ok) {
        throw new Error('Falha ao criar conta');
      }
    } catch (error) {
      console.error(error);
    }
  }
}
