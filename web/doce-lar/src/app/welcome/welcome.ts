import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  imports: [RouterLink],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome {
  protected readonly cart = inject(CartService);
  protected readonly quantidadeSelecionada = signal<Record<string, number>>({});
  protected readonly carrinhoAberto = signal(false);

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
}
