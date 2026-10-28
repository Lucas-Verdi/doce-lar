import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { environment } from '../environments/environment';

export interface AuthSession {
  accessToken: string;
  email: string;
  username: string;
  fullName: string | null;
}

interface LoginResponse {
  access_token: string;
  username?: string;
  full_name?: string | null;
}

interface PublicUser {
  username: string;
  full_name: string | null;
}

const SESSION_KEY = 'doce-lar-sessao';
const USERNAMES_KEY = 'doce-lar-usuarios';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly sessionState = signal<AuthSession | null>(this.loadSession());

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  async login(email: string, password: string): Promise<void> {
    const response = await fetch(`${environment.apiUrl}/api/user_login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response, 'Não foi possível fazer login.'));
    }

    const result: unknown = await response.json();
    if (!isLoginResponse(result)) {
      throw new Error('A resposta do servidor não contém um token de acesso.');
    }

    const knownUser = this.getKnownUser(email);
    this.saveSession({
      accessToken: result.access_token,
      email,
      username: result.username ?? knownUser?.username ?? email,
      fullName: result.full_name ?? knownUser?.full_name ?? null,
    });
  }

  async register(account: {
    username: string;
    full_name: string;
    email: string;
    password: string;
  }): Promise<void> {
    const response = await fetch(`${environment.apiUrl}/api/create_account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response, 'Não foi possível criar a conta.'));
    }

    const user: unknown = await response.json();
    if (!isPublicUser(user)) {
      throw new Error('A resposta do servidor não contém os dados da conta.');
    }

    this.saveKnownUser(account.email, user);
    await this.login(account.email, account.password);

    const currentSession = this.sessionState();
    if (currentSession) {
      this.saveSession({
        ...currentSession,
        username: user.username,
        fullName: user.full_name,
      });
    }
  }

  logout(): void {
    this.sessionState.set(null);
    if (!this.isBrowser) return;

    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Não foi possível encerrar a sessão salva no navegador.', error);
    }
  }

  private saveSession(session: AuthSession): void {
    this.sessionState.set(session);
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Não foi possível salvar a sessão no navegador.', error);
    }
  }

  private loadSession(): AuthSession | null {
    if (!this.isBrowser) return null;

    try {
      const savedSession: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
      if (isAuthSession(savedSession)) return savedSession;
      if (savedSession !== null) {
        console.error('A sessão salva no navegador tem um formato inválido.');
      }
    } catch (error) {
      console.error('Não foi possível carregar a sessão salva no navegador.', error);
    }
    return null;
  }

  private saveKnownUser(email: string, user: PublicUser): void {
    if (!this.isBrowser) return;

    try {
      const users = this.loadKnownUsers();
      users[email.toLowerCase()] = user;
      localStorage.setItem(USERNAMES_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Não foi possível salvar os dados da conta no navegador.', error);
    }
  }

  private getKnownUser(email: string): PublicUser | null {
    if (!this.isBrowser) return null;
    return this.loadKnownUsers()[email.toLowerCase()] ?? null;
  }

  private loadKnownUsers(): Record<string, PublicUser> {
    try {
      const users: unknown = JSON.parse(localStorage.getItem(USERNAMES_KEY) ?? '{}');
      if (typeof users === 'object' && users !== null && !Array.isArray(users)) {
        return Object.fromEntries(
          Object.entries(users).filter((entry): entry is [string, PublicUser] =>
            isPublicUser(entry[1]),
          ),
        );
      }
      console.error('Os dados de contas salvos no navegador têm um formato inválido.');
    } catch (error) {
      console.error('Não foi possível carregar os dados de contas do navegador.', error);
    }
    return {};
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
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false;
  const session = value as Record<string, unknown>;

  return (
    typeof session['accessToken'] === 'string' &&
    typeof session['email'] === 'string' &&
    typeof session['username'] === 'string' &&
    (typeof session['fullName'] === 'string' || session['fullName'] === null)
  );
}

function isPublicUser(value: unknown): value is PublicUser {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;

  return (
    typeof user['username'] === 'string' &&
    (typeof user['full_name'] === 'string' || user['full_name'] === null)
  );
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Record<string, unknown>;

  return (
    typeof response['access_token'] === 'string' &&
    (response['username'] === undefined || typeof response['username'] === 'string') &&
    (response['full_name'] === undefined ||
      typeof response['full_name'] === 'string' ||
      response['full_name'] === null)
  );
}
