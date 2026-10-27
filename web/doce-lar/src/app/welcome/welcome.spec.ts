import { TestBed } from '@angular/core/testing';
import { Welcome } from './welcome';

describe('Welcome', () => {
  it('should render title', async () => {
    await TestBed.configureTestingModule({ imports: [Welcome] }).compileComponents();
    const fixture = TestBed.createComponent(Welcome);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Doce Lar');
  });
});
