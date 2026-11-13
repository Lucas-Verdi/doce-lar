import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Welcome } from './welcome';
import { environment } from '../../environments/environment';

const products = [
  { id: 1, name: 'Morango Cremoso', description: 'Morangos', price: 40, in_stock: true, quantity: 10 },
  { id: 2, name: 'Brigadeiro', description: 'Chocolate', price: 40, in_stock: true, quantity: 10 },
];

describe('Welcome', () => {
  beforeEach(() => {
    localStorage.removeItem('doce-lar-carrinho');
    localStorage.removeItem('doce-lar-sessao');
  });

  it('should render title', async () => {
    await TestBed.configureTestingModule({
      imports: [Welcome],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Welcome);
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiUrl}/api/get_products`)
      .flush(products);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Doce Lar');
  });

  it('adds the selected product quantity to the cart', async () => {
    await TestBed.configureTestingModule({
      imports: [Welcome],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Welcome);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiUrl}/api/get_products`)
      .flush(products);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    const productCard = root.querySelector('#cardapio article:nth-child(2)') as HTMLElement;
    const increaseButton = productCard.querySelector(
      '[aria-label="Aumentar quantidade de Brigadeiro"]',
    ) as HTMLButtonElement;
    increaseButton.click();
    increaseButton.click();
    fixture.detectChanges();

    const addButton = productCard.querySelector('.btn-adicionar') as HTMLButtonElement;
    addButton?.click();
    fixture.detectChanges();

    expect(root.querySelector('.badge-carrinho')?.textContent).toContain('3');
    expect(localStorage.getItem('doce-lar-carrinho')).toContain('"quantidade":3');

    (root.querySelector('.btn-carrinho') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('.btn-pagamento') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(root.querySelector('.painel-carrinho')).toBeNull();
    expect(root.querySelector('.checkout-overlay')).not.toBeNull();
    expect(root.querySelector('.checkout-card')?.textContent).toContain(
      'Entre ou crie sua conta',
    );

    (root.querySelector('.checkout-botao-principal') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.checkout-card form')).not.toBeNull();
    expect(root.querySelector('.checkout-card')?.textContent).toContain('Entrar para continuar');
  });
});
