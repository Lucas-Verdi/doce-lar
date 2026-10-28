import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { CartService } from '../cart.service';
import { environment } from '../../environments/environment';

interface Cupcake {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  disponivel: boolean;
  estoque: number;
  emoji: string;
  cor: string;
}

interface ProductResponse {
  id: number;
  name: string;
  description: string | null;
  price: number;
  in_stock: boolean;
  quantity: number;
}

interface OrderResponse {
  id: number;
  total_amount: number;
  payment_method: 'credit_card' | 'pix';
  items: OrderItemResponse[];
}

interface OrderItemResponse {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

const presentationByName: Record<string, Pick<Cupcake, 'emoji' | 'cor'>> = {
  'Morango Cremoso': { emoji: '🍓', cor: '#ffd6e0' },
  Brigadeiro: { emoji: '🍫', cor: '#e7d3c4' },
  'Limão Siciliano': { emoji: '🍋', cor: '#fff3b8' },
  'Red Velvet': { emoji: '❤️', cor: '#ffc9c9' },
};

@Component({
  selector: 'app-welcome',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  protected readonly cupcakes = signal<Cupcake[]>([]);
  protected readonly produtosCarregando = signal(true);
  protected readonly produtosErro = signal('');
  protected readonly quantidadeSelecionada = signal<Record<string, number>>({});
  protected readonly carrinhoAberto = signal(false);
  protected readonly checkoutAberto = signal(false);
  protected readonly checkoutEtapa = signal<'opcoes' | 'login' | 'cadastro' | 'pagamento'>('opcoes');
  protected readonly checkoutErro = signal('');
  protected readonly checkoutEnviando = signal(false);
  protected readonly pagamentoSelecionado = signal<'cartao' | 'pix' | null>(null);
  protected readonly pagamentoConfirmado = signal(false);
  protected readonly historicoAberto = signal(false);
  protected readonly pedidos = signal<OrderResponse[]>([]);
  protected readonly pedidosCarregando = signal(false);
  protected readonly pedidosErro = signal('');

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

  protected readonly diferenciais = [
    { icone: '🧁', titulo: 'Feitos à mão', texto: 'Cada cupcake é preparado com carinho todos os dias.' },
    { icone: '🌾', titulo: 'Ingredientes selecionados', texto: 'Sem essências artificiais, só sabor de verdade.' },
    { icone: '🎁', titulo: 'Para presentear', texto: 'Caixas especiais para aniversários e eventos.' },
  ];

  constructor() {
    this.carregarProdutos();
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('checkout') === '1') {
        this.abrirCheckout();
      }
    });
  }

  protected recarregarProdutos(): void {
    this.carregarProdutos();
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
    if (!cupcake.disponivel || cupcake.estoque < 1) {
      return;
    }

    const { id, nome, emoji, preco } = cupcake;
    this.cart.add({ id, nome, emoji, preco }, this.obterQuantidade(id));
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

  protected selecionarPagamento(meio: 'cartao' | 'pix'): void {
    this.pagamentoSelecionado.set(meio);
    this.pagamentoConfirmado.set(false);
  }

  protected async confirmarPagamento(): Promise<void> {
    if (this.pagamentoConfirmado()) {
      this.fecharCheckout();
      return;
    }

    const pagamento = this.pagamentoSelecionado();
    if (pagamento === null || this.cart.items().length === 0) {
      return;
    }

    this.checkoutErro.set('');
    this.checkoutEnviando.set(true);
    try {
      const response = await fetch(`${environment.apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.auth.session()?.accessToken ?? ''}`,
        },
        body: JSON.stringify({
          items: this.cart.items().map((item) => ({
            product_id: Number(item.id),
            quantity: item.quantidade,
          })),
          payment_method: pagamento === 'cartao' ? 'credit_card' : 'pix',
        }),
      });

      if (!response.ok) {
        throw new Error(await this.getErrorMessage(response, 'Não foi possível gerar o pedido.'));
      }

      this.cart.clear();
      this.pagamentoConfirmado.set(true);
      await this.carregarHistorico();
    } catch (error) {
      this.checkoutErro.set(
        error instanceof Error ? error.message : 'Não foi possível gerar o pedido.',
      );
    } finally {
      this.checkoutEnviando.set(false);
    }
  }

  protected async abrirHistorico(): Promise<void> {
    this.historicoAberto.set(true);
    await this.carregarHistorico();
  }

  protected fecharHistorico(): void {
    this.historicoAberto.set(false);
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
    this.pagamentoSelecionado.set(null);
    this.pagamentoConfirmado.set(false);
    this.checkoutEtapa.set(this.auth.isAuthenticated() ? 'pagamento' : 'opcoes');
    this.checkoutAberto.set(true);
  }

  private carregarProdutos(): void {
    this.produtosCarregando.set(true);
    this.produtosErro.set('');

    this.http.get<ProductResponse[]>(`${environment.apiUrl}/api/get_products`).subscribe({
      next: (products) => {
        this.cupcakes.set(products.map((product) => this.mapProduct(product)));
        this.cart.atualizarPrecos(
          new Map(products.map((product) => [String(product.id), product.price])),
        );
        this.produtosCarregando.set(false);
      },
      error: (error: unknown) => {
        console.error('Não foi possível carregar os produtos.', error);
        this.produtosErro.set('Não foi possível carregar o cardápio. Tente novamente.');
        this.produtosCarregando.set(false);
      },
    });
  }

  private async carregarHistorico(): Promise<void> {
    const accessToken = this.auth.session()?.accessToken;
    if (!accessToken) return;

    this.pedidosCarregando.set(true);
    this.pedidosErro.set('');
    try {
      const response = await fetch(`${environment.apiUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error(await this.getErrorMessage(response, 'Não foi possível carregar os pedidos.'));
      }
      const orders: unknown = await response.json();
      if (!Array.isArray(orders)) {
        throw new Error('A resposta do servidor contém um histórico inválido.');
      }
      if (!orders.every(isOrderResponse)) {
        throw new Error('A resposta do servidor contém pedidos inválidos.');
      }
      this.pedidos.set(orders);
    } catch (error) {
      console.error('Não foi possível carregar o histórico de pedidos.', error);
      this.pedidosErro.set(
        error instanceof Error ? error.message : 'Não foi possível carregar os pedidos.',
      );
    } finally {
      this.pedidosCarregando.set(false);
    }
  }

  private async getErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'detail' in body) {
        const detail = body.detail;
        if (typeof detail === 'string') return detail;
      }
    } catch (error) {
      console.error('Não foi possível ler a mensagem de erro do servidor.', error);
    }
    return fallback;
  }

  private mapProduct(product: ProductResponse): Cupcake {
    const presentation = presentationByName[product.name] ?? {
      emoji: '🧁',
      cor: '#f5e1d3',
    };

    return {
      id: String(product.id),
      nome: product.name,
      descricao: product.description ?? 'Delicioso cupcake artesanal.',
      preco: product.price,
      disponivel: product.in_stock && product.quantity > 0,
      estoque: product.quantity,
      ...presentation,
    };
  }
}

function isOrderResponse(value: unknown): value is OrderResponse {
  if (typeof value !== 'object' || value === null) return false;
  const order = value as Record<string, unknown>;

  return (
    typeof order['id'] === 'number' &&
    typeof order['total_amount'] === 'number' &&
    (order['payment_method'] === 'credit_card' || order['payment_method'] === 'pix') &&
    Array.isArray(order['items']) &&
    order['items'].every(isOrderItemResponse)
  );
}

function isOrderItemResponse(value: unknown): value is OrderItemResponse {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;

  return (
    typeof item['product_id'] === 'number' &&
    typeof item['name'] === 'string' &&
    typeof item['price'] === 'number' &&
    typeof item['quantity'] === 'number' &&
    typeof item['subtotal'] === 'number'
  );
}
