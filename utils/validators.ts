/**
 * Utilitários de Validação - BusinessApp
 * 
 * Funções centralizadas para validação de dados.
 * Evita duplicação de código de validação em múltiplos componentes.
 * 
 * Uso:
 * import { validarEmail, validarTelefone, validarCPF } from '@utils/validators';
 */

import { logger } from './logger';

// ============================================================================
// VALIDAÇÕES DE FORMATO
// ============================================================================

/**
 * Valida formato de email
 * @param email Email a ser validado
 * @returns true se email é válido
 */
export const validarEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email.trim().toLowerCase());
  
  if (!isValid) {
    logger.debug('Email inválido:', email);
  }
  
  return isValid;
};

/**
 * Valida e formata telefone brasileiro
 * Remove caracteres não numéricos e valida formato
 * @param telefone Telefone a ser validado
 * @returns true se telefone é válido (10 ou 11 dígitos)
 */
export const validarTelefone = (telefone: string): boolean => {
  if (!telefone || typeof telefone !== 'string') {
    return false;
  }

  // Remove tudo exceto números
  const numeroLimpo = telefone.replace(/\D/g, '');
  
  // Telefone brasileiro: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX
  // 10 dígitos (fixo) ou 11 dígitos (celular)
  const isValid = numeroLimpo.length === 10 || numeroLimpo.length === 11;
  
  if (!isValid) {
    logger.debug('Telefone inválido:', telefone, '- Dígitos:', numeroLimpo.length);
  }
  
  return isValid;
};

/**
 * Valida CPF brasileiro
 * @param cpf CPF a ser validado (com ou sem formatação)
 * @returns true se CPF é válido
 */
export const validarCPF = (cpf: string): boolean => {
  if (!cpf || typeof cpf !== 'string') {
    return false;
  }

  // Remove caracteres não numéricos
  const cpfLimpo = cpf.replace(/\D/g, '');

  // CPF deve ter 11 dígitos
  if (cpfLimpo.length !== 11) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cpfLimpo)) {
    return false;
  }

  // Valida dígitos verificadores
  let soma = 0;
  let resto;

  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpfLimpo.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.substring(9, 10))) {
    logger.debug('CPF inválido (1º dígito verificador):', cpf);
    return false;
  }

  // Segundo dígito verificador
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpfLimpo.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.substring(10, 11))) {
    logger.debug('CPF inválido (2º dígito verificador):', cpf);
    return false;
  }

  return true;
};

/**
 * Valida CNPJ brasileiro
 * @param cnpj CNPJ a ser validado (com ou sem formatação)
 * @returns true se CNPJ é válido
 */
export const validarCNPJ = (cnpj: string): boolean => {
  if (!cnpj || typeof cnpj !== 'string') {
    return false;
  }

  // Remove caracteres não numéricos
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  // CNPJ deve ter 14 dígitos
  if (cnpjLimpo.length !== 14) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (CNPJ inválido)
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) {
    return false;
  }

  // Valida dígitos verificadores
  let tamanho = cnpjLimpo.length - 2;
  let numeros = cnpjLimpo.substring(0, tamanho);
  const digitos = cnpjLimpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) {
    logger.debug('CNPJ inválido (1º dígito verificador):', cnpj);
    return false;
  }

  tamanho = tamanho + 1;
  numeros = cnpjLimpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) {
    logger.debug('CNPJ inválido (2º dígito verificador):', cnpj);
    return false;
  }

  return true;
};

/**
 * Valida CEP brasileiro
 * @param cep CEP a ser validado (com ou sem formatação)
 * @returns true se CEP tem formato válido (8 dígitos)
 */
export const validarCEP = (cep: string): boolean => {
  if (!cep || typeof cep !== 'string') {
    return false;
  }

  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.length === 8;
};

// ============================================================================
// FORMATAÇÕES
// ============================================================================

/**
 * Formata telefone brasileiro
 * @param telefone Telefone sem formatação
 * @returns Telefone formatado: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX
 */
export const formatarTelefone = (telefone: string): string => {
  if (!telefone) return '';

  const numero = telefone.replace(/\D/g, '');

  if (numero.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return numero.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (numero.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return numero.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return telefone;
};

/**
 * Formata CPF brasileiro
 * @param cpf CPF sem formatação
 * @returns CPF formatado: XXX.XXX.XXX-XX
 */
export const formatarCPF = (cpf: string): string => {
  if (!cpf) return '';

  const numero = cpf.replace(/\D/g, '');
  
  if (numero.length !== 11) {
    return cpf;
  }

  return numero.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata CNPJ brasileiro
 * @param cnpj CNPJ sem formatação
 * @returns CNPJ formatado: XX.XXX.XXX/XXXX-XX
 */
export const formatarCNPJ = (cnpj: string): string => {
  if (!cnpj) return '';

  const numero = cnpj.replace(/\D/g, '');
  
  if (numero.length !== 14) {
    return cnpj;
  }

  return numero.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Formata CEP brasileiro
 * @param cep CEP sem formatação
 * @returns CEP formatado: XXXXX-XXX
 */
export const formatarCEP = (cep: string): string => {
  if (!cep) return '';

  const numero = cep.replace(/\D/g, '');
  
  if (numero.length !== 8) {
    return cep;
  }

  return numero.replace(/(\d{5})(\d{3})/, '$1-$2');
};

/**
 * Formata moeda brasileira
 * @param valor Valor numérico
 * @returns Valor formatado: R$ X.XXX,XX
 */
export const formatarMoeda = (valor: number): string => {
  if (typeof valor !== 'number' || isNaN(valor)) {
    return 'R$ 0,00';
  }

  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

/**
 * Formata data brasileira
 * @param data Data a ser formatada (Date, string ISO, timestamp)
 * @returns Data formatada: DD/MM/YYYY
 */
export const formatarData = (data: Date | string | number): string => {
  if (!data) return '';

  try {
    const dataObj = typeof data === 'string' || typeof data === 'number' 
      ? new Date(data) 
      : data;

    if (isNaN(dataObj.getTime())) {
      return '';
    }

    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();

    return `${dia}/${mes}/${ano}`;
  } catch (error) {
    logger.error('Erro ao formatar data:', error);
    return '';
  }
};

/**
 * Formata data e hora brasileira
 * @param data Data a ser formatada
 * @returns Data formatada: DD/MM/YYYY HH:mm
 */
export const formatarDataHora = (data: Date | string | number): string => {
  if (!data) return '';

  try {
    const dataObj = typeof data === 'string' || typeof data === 'number' 
      ? new Date(data) 
      : data;

    if (isNaN(dataObj.getTime())) {
      return '';
    }

    const dataFormatada = formatarData(dataObj);
    const horas = String(dataObj.getHours()).padStart(2, '0');
    const minutos = String(dataObj.getMinutes()).padStart(2, '0');

    return `${dataFormatada} ${horas}:${minutos}`;
  } catch (error) {
    logger.error('Erro ao formatar data/hora:', error);
    return '';
  }
};

// ============================================================================
// VALIDAÇÕES DE NEGÓCIO
// ============================================================================

/**
 * Valida se valor é positivo
 * @param valor Valor a ser validado
 * @returns true se valor > 0
 */
export const validarValorPositivo = (valor: number): boolean => {
  return typeof valor === 'number' && !isNaN(valor) && valor > 0;
};

/**
 * Valida se quantidade é válida para estoque
 * @param quantidade Quantidade a ser validada
 * @returns true se quantidade >= 0
 */
export const validarQuantidade = (quantidade: number): boolean => {
  return typeof quantidade === 'number' && !isNaN(quantidade) && quantidade >= 0;
};

/**
 * Valida nome (mínimo 2 caracteres)
 * @param nome Nome a ser validado
 * @returns true se nome é válido
 */
export const validarNome = (nome: string): boolean => {
  if (!nome || typeof nome !== 'string') {
    return false;
  }

  const nomeLimpo = nome.trim();
  return nomeLimpo.length >= 2;
};

/**
 * Valida se data é futura
 * @param data Data a ser validada
 * @returns true se data é futura
 */
export const validarDataFutura = (data: Date | string): boolean => {
  try {
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return dataObj >= hoje;
  } catch (error) {
    logger.error('Erro ao validar data futura:', error);
    return false;
  }
};

/**
 * Valida senha (mínimo 6 caracteres)
 * @param senha Senha a ser validada
 * @returns true se senha é válida
 */
export const validarSenha = (senha: string): boolean => {
  if (!senha || typeof senha !== 'string') {
    return false;
  }

  return senha.length >= 6;
};

/**
 * Valida se senha e confirmação são iguais
 * @param senha Senha
 * @param confirmacao Confirmação da senha
 * @returns true se senhas são iguais
 */
export const validarConfirmacaoSenha = (senha: string, confirmacao: string): boolean => {
  return senha === confirmacao && validarSenha(senha);
};

// ============================================================================
// SANITIZAÇÃO
// ============================================================================

/**
 * Remove caracteres não numéricos
 * @param texto Texto a ser sanitizado
 * @returns Apenas números
 */
export const somenteNumeros = (texto: string): string => {
  if (!texto || typeof texto !== 'string') {
    return '';
  }

  return texto.replace(/\D/g, '');
};

/**
 * Remove espaços extras e trim
 * @param texto Texto a ser sanitizado
 * @returns Texto limpo
 */
export const limparTexto = (texto: string): string => {
  if (!texto || typeof texto !== 'string') {
    return '';
  }

  return texto.trim().replace(/\s+/g, ' ');
};

/**
 * Normaliza string (remove acentos e converte para minúsculas)
 * @param texto Texto a ser normalizado
 * @returns Texto normalizado
 */
export const normalizarTexto = (texto: string): string => {
  if (!texto || typeof texto !== 'string') {
    return '';
  }

  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica se string está vazia
 * @param texto Texto a ser verificado
 * @returns true se string é vazia ou apenas espaços
 */
export const estaVazio = (texto: string | null | undefined): boolean => {
  return !texto || texto.trim().length === 0;
};

/**
 * Trunca texto com reticências
 * @param texto Texto a ser truncado
 * @param maxLength Comprimento máximo
 * @returns Texto truncado
 */
export const truncarTexto = (texto: string, maxLength: number): string => {
  if (!texto || texto.length <= maxLength) {
    return texto;
  }

  return texto.substring(0, maxLength - 3) + '...';
};

/**
 * Capitaliza primeira letra
 * @param texto Texto a ser capitalizado
 * @returns Texto com primeira letra maiúscula
 */
export const capitalizarPrimeiraLetra = (texto: string): string => {
  if (!texto || typeof texto !== 'string') {
    return '';
  }

  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

/**
 * Capitaliza cada palavra
 * @param texto Texto a ser capitalizado
 * @returns Texto com cada palavra capitalizada
 */
export const capitalizarPalavras = (texto: string): string => {
  if (!texto || typeof texto !== 'string') {
    return '';
  }

  return texto
    .toLowerCase()
    .split(' ')
    .map(palavra => capitalizarPrimeiraLetra(palavra))
    .join(' ');
};

// ============================================================================
// FORMATAÇÕES PROGRESSIVAS (Para Inputs)
// ============================================================================

/**
 * Formata telefone progressivamente conforme usuário digita
 * @param valor Valor parcial digitado
 * @returns Telefone formatado progressivamente
 */
export const formatarTelefoneInput = (valor: string): string => {
  const numeroLimpo = valor.replace(/\D/g, '');
  if (numeroLimpo.length === 0) return '';
  if (numeroLimpo.length <= 2) return `(${numeroLimpo}`;
  if (numeroLimpo.length <= 7) return `(${numeroLimpo.slice(0, 2)}) ${numeroLimpo.slice(2)}`;
  return `(${numeroLimpo.slice(0, 2)}) ${numeroLimpo.slice(2, 7)}-${numeroLimpo.slice(7, 11)}`;
};

/**
 * Formata data progressivamente conforme usuário digita
 * @param valor Valor parcial digitado
 * @returns Data formatada progressivamente DD/MM/YYYY
 */
export const formatarDataInput = (valor: string): string => {
  const numeroLimpo = valor.replace(/\D/g, '');
  if (numeroLimpo.length === 0) return '';
  if (numeroLimpo.length <= 2) return numeroLimpo;
  if (numeroLimpo.length <= 4) return `${numeroLimpo.slice(0, 2)}/${numeroLimpo.slice(2)}`;
  return `${numeroLimpo.slice(0, 2)}/${numeroLimpo.slice(2, 4)}/${numeroLimpo.slice(4, 8)}`;
};

/**
 * Formata CPF progressivamente conforme usuário digita
 * @param valor Valor parcial digitado
 * @returns CPF formatado progressivamente
 */
export const formatarCPFInput = (valor: string): string => {
  const numeroLimpo = valor.replace(/\D/g, '');
  if (numeroLimpo.length === 0) return '';
  if (numeroLimpo.length <= 3) return numeroLimpo;
  if (numeroLimpo.length <= 6) return `${numeroLimpo.slice(0, 3)}.${numeroLimpo.slice(3)}`;
  if (numeroLimpo.length <= 9) return `${numeroLimpo.slice(0, 3)}.${numeroLimpo.slice(3, 6)}.${numeroLimpo.slice(6)}`;
  return `${numeroLimpo.slice(0, 3)}.${numeroLimpo.slice(3, 6)}.${numeroLimpo.slice(6, 9)}-${numeroLimpo.slice(9, 11)}`;
};

/**
 * Formata CNPJ progressivamente conforme usuário digita
 * @param valor Valor parcial digitado
 * @returns CNPJ formatado progressivamente
 */
export const formatarCNPJInput = (valor: string): string => {
  const numeroLimpo = valor.replace(/\D/g, '');
  if (numeroLimpo.length === 0) return '';
  if (numeroLimpo.length <= 2) return numeroLimpo;
  if (numeroLimpo.length <= 5) return `${numeroLimpo.slice(0, 2)}.${numeroLimpo.slice(2)}`;
  if (numeroLimpo.length <= 8) return `${numeroLimpo.slice(0, 2)}.${numeroLimpo.slice(2, 5)}.${numeroLimpo.slice(5)}`;
  if (numeroLimpo.length <= 12) return `${numeroLimpo.slice(0, 2)}.${numeroLimpo.slice(2, 5)}.${numeroLimpo.slice(5, 8)}/${numeroLimpo.slice(8)}`;
  return `${numeroLimpo.slice(0, 2)}.${numeroLimpo.slice(2, 5)}.${numeroLimpo.slice(5, 8)}/${numeroLimpo.slice(8, 12)}-${numeroLimpo.slice(12, 14)}`;
};

/**
 * Formata moeda progressivamente conforme usuário digita
 * @param valor Valor parcial digitado
 * @returns Moeda formatada progressivamente R$ X.XXX,XX
 */
export const formatarMoedaInput = (valor: string): string => {
  const numeroLimpo = valor.replace(/\D/g, '');
  const numero = parseInt(numeroLimpo || '0') / 100;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Valida data no formato DD/MM/YYYY
 * @param data Data formatada
 * @returns true se data é válida
 */
export const validarDataFormatada = (data: string): boolean => {
  if (!data) return false;
  const [dia, mes, ano] = data.split('/').map(Number);
  if (!dia || !mes || !ano) return false;
  
  const dataObj = new Date(ano, mes - 1, dia);
  return (
    dataObj instanceof Date &&
    !isNaN(dataObj.getTime()) &&
    dataObj.getDate() === dia &&
    dataObj.getMonth() === mes - 1 &&
    dataObj.getFullYear() === ano &&
    ano >= 1900 &&
    ano <= new Date().getFullYear() + 100
  );
};

