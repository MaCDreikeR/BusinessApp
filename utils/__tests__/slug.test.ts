/**
 * ============================================
 * Testes: Utilitário de Slug
 * ============================================
 */

import { gerarSlugBase, validarSlug } from '../slug';

describe('Utilitário de Slug', () => {
  describe('gerarSlugBase', () => {
    it('deve gerar slug básico corretamente', () => {
      expect(gerarSlugBase('Salão Emily Borges')).toBe('salaoemillyborges');
      expect(gerarSlugBase('Salão Emilly Borges')).toBe('salaoemillyborges');
    });

    it('deve remover acentos', () => {
      expect(gerarSlugBase('Barbearia São José')).toBe('barbariasaojose');
      expect(gerarSlugBase('Clínica Médica')).toBe('clinicamedica');
      expect(gerarSlugBase('Estúdio de Beleza')).toBe('estudiodebeleza');
    });

    it('deve converter para lowercase', () => {
      expect(gerarSlugBase('SALAO BELEZA')).toBe('salaobeleza');
      expect(gerarSlugBase('Barbearia PREMIUM')).toBe('barbariapremium');
    });

    it('deve remover caracteres especiais e espaços', () => {
      expect(gerarSlugBase('Salão & Spa')).toBe('salaospa');
      expect(gerarSlugBase('Beauty@Home')).toBe('beautyhome');
      expect(gerarSlugBase('Estúdio #1')).toBe('estudio1');
    });

    it('deve remover todos os espaços', () => {
      expect(gerarSlugBase('Salão    de    Beleza')).toBe('salaodebeleza');
    });

    it('deve remover caracteres especiais do início e fim', () => {
      expect(gerarSlugBase('---Salão---')).toBe('salao');
    });

    it('deve limitar tamanho a 100 caracteres', () => {
      const nomeGrande = 'a'.repeat(150);
      const slug = gerarSlugBase(nomeGrande);
      expect(slug.length).toBeLessThanOrEqual(100);
    });

    it('deve retornar fallback para texto vazio', () => {
      expect(gerarSlugBase('')).toBe('estabelecimento');
      expect(gerarSlugBase('   ')).toBe('estabelecimento');
    });

    it('deve garantir mínimo de 3 caracteres', () => {
      const slug = gerarSlugBase('ab');
      expect(slug.length).toBeGreaterThanOrEqual(3);
    });

    it('deve lidar com casos reais', () => {
      expect(gerarSlugBase('Studio Hair by João')).toBe('studiohairbyjoao');
      expect(gerarSlugBase('Espaço Zen & Yoga')).toBe('espacozenyoga');
      expect(gerarSlugBase('Clínica Dr. Silva')).toBe('clinicadrsilva');
    });
  });

  describe('validarSlug', () => {
    it('deve validar slug correto', () => {
      expect(validarSlug('salaoemillyborges')).toBe(true);
      expect(validarSlug('barbearia123')).toBe(true);
      expect(validarSlug('studiobyjoao')).toBe(true);
    });

    it('deve rejeitar slug com caracteres inválidos', () => {
      expect(validarSlug('salãobeleza')).toBe(false); // acento
      expect(validarSlug('salao beleza')).toBe(false); // espaço
      expect(validarSlug('salao_beleza')).toBe(false); // underscore
      expect(validarSlug('salao@beleza')).toBe(false); // @
      expect(validarSlug('salao-beleza')).toBe(false); // hífen (não permitido mais)
    });

    it('deve rejeitar slug com letra maiúscula', () => {
      expect(validarSlug('SalaoEmily')).toBe(false);
      expect(validarSlug('salao-Emily')).toBe(false);
    });

    it('deve rejeitar slug muito curto', () => {
      expect(validarSlug('ab')).toBe(false);
      expect(validarSlug('a')).toBe(false);
    });

    it('deve rejeitar slug muito longo', () => {
      const slugGrande = 'a'.repeat(101);
      expect(validarSlug(slugGrande)).toBe(false);
    });

    it('deve aceitar slug de 3 caracteres', () => {
      expect(validarSlug('abc')).toBe(true);
    });

    it('deve aceitar slug de 100 caracteres', () => {
      const slug100 = 'a'.repeat(100);
      expect(validarSlug(slug100)).toBe(true);
    });
  });
});
