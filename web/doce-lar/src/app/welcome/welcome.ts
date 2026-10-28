import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';

interface Cupcake {
  id: string;
  nome: string;
  descricao: string;
  emoji: string;
  cor: string;
}

@Component({
  selector: 'app-welcome',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  protected readonly quantidadeSelecionada = signal<Record<string, number>>({});
  protected readonly carrinhoAberto = signal(false);
  protected readonly checkoutAberto = signal(false);
  protected readonly checkoutEtapa = signal<'opcoes' | 'login' | 'cadastro' | 'pagamento'>('opcoes');
  protected readonly checkoutErro = signal('');
  protected readonly checkoutEnviando = signal(false);

  protected readonly checkoutLoginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly checkoutCadastroForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmar: ['', Validators.required],
  });

  protected readonly cupcakes: Cupcake[] = [
    { id: 'morango-cremoso', nome: 'Morango Cremoso', descricao: 'Massa de baunilha com recheio e cobertura de morango.', emoji: '🍓', cor: '#ffd6e0' },
    { id: 'brigadeiro', nome: 'Brigadeiro', descricao: 'Massa de chocolate com brigadeiro belga e granulado.', emoji: '🍫', cor: '#e7d3c4' },
    { id: 'limao-siciliano', nome: 'Limão Siciliano', descricao: 'Massa leve com creme cítrico de limão.', emoji: '🍋', cor: '#fff3b8' },
    { id: 'red-velvet', nome: 'Red Velvet', descricao: 'Clássico aveludado com cream cheese.', emoji: '❤️', cor: '#ffc9c9' },
  ];

  protected readonly diferenciais = [
    { icone: '🧁', titulo: 'Feitos à mão', texto: 'Cada cupcake é preparado com carinho todos os dias.' },
    { icone: '🌾', titulo: 'Ingredientes selecionados', texto: 'Sem essências artificiais, só sabor de verdade.' },
    { icone: '🎁', titulo: 'Para presentear', texto: 'Caixas especiais para aniversários e eventos.' },
  ];

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('checkout') === '1') {
        this.abrirCheckout();
      }
    });
  }

  protected alterarQuantidadeSelecionada(id: string, incremento: number): void {
    this.quantidadeSelecionada.update((selecionadas) => ({
      ...selecionadas,
      [id]: Math.min(99, Math.max(1, this.obterQuantidade(id) + incremento)),
    }));
  }

  protected obterQuantidade(id: string): number {
    return this.quantidadeSelecionada()[id] || 1;
  }

  protected adicionarAoCarrinho(cupcake: Cupcake): void {
    const { id, nome, emoji } = cupcake;
    this.cart.add({ id, nome, emoji }, this.obterQuantidade(id));
  }

  protected alterarQuantidade(id: string, quantidade: number): void {
    this.cart.setQuantity(id, quantidade);
  }

  protected iniciarCheckout(): void {
    this.abrirCheckout();
  }

  protected fecharCheckout(): void {
    this.checkoutAberto.set(false);
  }

  protected async entrarNoCheckout(): Promise<void> {
    if (this.checkoutLoginForm.invalid) {
      this.checkoutLoginForm.markAllAsTouched();
      return;
    }

    this.checkoutErro.set('');
    this.checkoutEnviando.set(true);
    try {
      const { email, password } = this.checkoutLoginForm.getRawValue();
      await this.auth.login(email, password);
      this.checkoutEtapa.set('pagamento');
    } catch (error) {
      this.checkoutErro.set(
        error instanceof Error ? error.message : 'Não foi possível fazer login.',
      );
    } finally {
      this.checkoutEnviando.set(false);
    }
  }

  protected async criarContaNoCheckout(): Promise<void> {
    if (this.checkoutCadastroForm.invalid) {
      this.checkoutCadastroForm.markAllAsTouched();
      return;
    }

    const { username, full_name, email, password, confirmar } =
      this.checkoutCadastroForm.getRawValue();
    if (password !== confirmar) {
      this.checkoutCadastroForm.controls.confirmar.setErrors({ senhasDiferentes: true });
      this.checkoutCadastroForm.controls.confirmar.markAsTouched();
      return;
    }

    this.checkoutErro.set('');
    this.checkoutEnviando.set(true);
    try {
      await this.auth.register({ username, full_name, email, password });
      this.checkoutEtapa.set('pagamento');
    } catch (error) {
      this.checkoutErro.set(
        error instanceof Error ? error.message : 'Não foi possível criar a conta.',
      );
    } finally {
      this.checkoutEnviando.set(false);
    }
  }

  protected encerrarSessao(): void {
    this.auth.logout();
    this.checkoutAberto.set(false);
  }

  private abrirCheckout(): void {
    this.carrinhoAberto.set(false);
    this.checkoutErro.set('');
    this.checkoutEtapa.set(this.auth.isAuthenticated() ? 'pagamento' : 'opcoes');
    this.checkoutAberto.set(true);
  }
}
