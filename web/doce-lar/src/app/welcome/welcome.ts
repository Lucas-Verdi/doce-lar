import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Cupcake {
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
  protected readonly cupcakes: Cupcake[] = [
    { nome: 'Morango Cremoso', descricao: 'Massa de baunilha com recheio e cobertura de morango.', emoji: '🍓', cor: '#ffd6e0' },
    { nome: 'Brigadeiro', descricao: 'Massa de chocolate com brigadeiro belga e granulado.', emoji: '🍫', cor: '#e7d3c4' },
    { nome: 'Limão Siciliano', descricao: 'Massa leve com creme cítrico de limão.', emoji: '🍋', cor: '#fff3b8' },
    { nome: 'Red Velvet', descricao: 'Clássico aveludado com cream cheese.', emoji: '❤️', cor: '#ffc9c9' },
  ];

  protected readonly diferenciais = [
    { icone: '🧁', titulo: 'Feitos à mão', texto: 'Cada cupcake é preparado com carinho todos os dias.' },
    { icone: '🌾', titulo: 'Ingredientes selecionados', texto: 'Sem essências artificiais, só sabor de verdade.' },
    { icone: '🎁', titulo: 'Para presentear', texto: 'Caixas especiais para aniversários e eventos.' },
  ];
}
