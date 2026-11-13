import { Routes } from '@angular/router';
import { Welcome } from './welcome/welcome';
import { Login } from './login/login';
import { Cadastro } from './cadastro/cadastro';
import { Perfil } from './perfil/perfil';
import { RecuperarSenha } from './recuperar-senha/recuperar-senha';
import { RedefinirSenha } from './redefinir-senha/redefinir-senha';

export const routes: Routes = [
  { path: '', component: Welcome },
  { path: 'login', component: Login },
  { path: 'cadastro', component: Cadastro },
  { path: 'perfil', component: Perfil },
  { path: 'recuperar-senha', component: RecuperarSenha },
  { path: 'redefinir-senha', component: RedefinirSenha },
  { path: '**', redirectTo: '' },
];
