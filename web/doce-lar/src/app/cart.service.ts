import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export interface CartItem {
  id: string;
  nome: string;
  emoji: string;
  preco: number;
  quantidade: number;
}

const STORAGE_KEY = 'doce-lar-carrinho';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly itemsState = signal<CartItem[]>(this.loadItems());

  readonly items = this.itemsState.asReadonly();
  readonly totalItems = computed(() =>
    this.itemsState().reduce((total, item) => total + item.quantidade, 0),
  );
  readonly total = computed(() =>
    this.itemsState().reduce((total, item) => total + item.preco * item.quantidade, 0),
  );

  add(item: Omit<CartItem, 'quantidade'>, quantidade: number): void {
    const currentItems = this.itemsState();
    const existingItem = currentItems.find((cartItem) => cartItem.id === item.id);

    this.updateItems(
      existingItem
        ? currentItems.map((cartItem) =>
            cartItem.id === item.id
              ? { ...cartItem, quantidade: cartItem.quantidade + quantidade }
              : cartItem,
          )
        : [...currentItems, { ...item, quantidade }],
    );
  }

  atualizarPrecos(precos: ReadonlyMap<string, number>): void {
    const items = this.itemsState().map((item) => {
      const preco = precos.get(item.id);
      return preco === undefined ? item : { ...item, preco };
    });

    this.updateItems(items);
  }

  setQuantity(id: string, quantidade: number): void {
    this.updateItems(
      this.itemsState().map((item) =>
        item.id === id ? { ...item, quantidade: Math.max(1, quantidade) } : item,
      ),
    );
  }

  remove(id: string): void {
    this.updateItems(this.itemsState().filter((item) => item.id !== id));
  }

  clear(): void {
    this.updateItems([]);
  }

  private updateItems(items: CartItem[]): void {
    this.itemsState.set(items);
    this.saveItems(items);
  }

  private loadItems(): CartItem[] {
    if (!this.isBrowser) return [];

    try {
      const storedItems: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      if (!Array.isArray(storedItems) || !storedItems.every(isCartItem)) {
        console.error('O carrinho salvo no navegador tem um formato inválido.');
        return [];
      }
      return storedItems.map((item) => ({ ...item, preco: item.preco ?? 0 }));
    } catch (error) {
      console.error('Não foi possível carregar o carrinho salvo no navegador.', error);
      return [];
    }
  }

  private saveItems(items: CartItem[]): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Não foi possível salvar o carrinho no navegador.', error);
    }
  }
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;

  return (
    typeof item['id'] === 'string' &&
    typeof item['nome'] === 'string' &&
    typeof item['emoji'] === 'string' &&
    (item['preco'] === undefined ||
      (typeof item['preco'] === 'number' && Number.isFinite(item['preco']) && item['preco'] >= 0)) &&
    typeof item['quantidade'] === 'number' &&
    Number.isInteger(item['quantidade']) &&
    item['quantidade'] > 0
  );
}
