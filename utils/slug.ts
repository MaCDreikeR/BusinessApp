/**
 * ============================================
 * Utilitário: Geração de Slug
 * ============================================
 * 
 * Funções para gerar slugs válidos e únicos para estabelecimentos.
 * Usado no cadastro e atualização de estabelecimentos.
 * 
 * Regras:
 * - Lowercase
 * - Sem acentos
 * - Sem espaços (usa hífen)
 * - Apenas letras, números e hífen
 * - Mínimo 3 caracteres
 * - Máximo 100 caracteres
 */

import { supabase } from '../lib/supabase';
import { logger } from './logger';

/**
 * Remove acentos e normaliza texto para ASCII
 */
function removerAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Gera slug base a partir de um texto
 * 
 * @param texto - Texto original (ex: "Salão Emily Borges")
 * @returns Slug base (ex: "salao-emily-borges")
 */
export function gerarSlugBase(texto: string): string {
  if (!texto || typeof texto !== 'string') {
    return 'estabelecimento';
  }

  let slug = texto.trim();
  
  // Converter para lowercase
  slug = slug.toLowerCase();
  
  // Remover acentos
  slug = removerAcentos(slug);
  
  // Remover todos os espaços e underscores (sem substituir, apenas remover)
  slug = slug.replace(/[\s_]+/g, '');
  
  // Remover caracteres especiais (manter apenas letras e números)
  slug = slug.replace(/[^a-z0-9]/g, '');
  
  // Limitar tamanho
  slug = slug.substring(0, 100);
  
  // Se ficou vazio, usar fallback
  if (!slug) {
    slug = 'estabelecimento';
  }
  
  // Garantir mínimo de 3 caracteres
  if (slug.length < 3) {
    slug = slug + '-' + Date.now().toString().slice(-4);
  }
  
  return slug;
}

/**
 * Valida formato do slug
 * 
 * @param slug - Slug a ser validado
 * @returns true se válido, false caso contrário
 */
export function validarSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }
  
  // Verificar tamanho
  if (slug.length < 3 || slug.length > 100) {
    return false;
  }
  
  // Verificar formato (apenas letras minúsculas e números, sem hífen)
  const formatoValido = /^[a-z0-9]+$/;
  if (!formatoValido.test(slug)) {
    return false;
  }
  
  return true;
}

/**
 * Verifica se um slug já existe no banco de dados
 * 
 * @param slug - Slug a ser verificado
 * @param estabelecimentoId - ID do estabelecimento atual (para ignorar em updates)
 * @returns true se já existe, false caso contrário
 */
export async function slugJaExiste(
  slug: string, 
  estabelecimentoId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('estabelecimentos')
      .select('id')
      .eq('slug', slug);
    
    // Se estiver atualizando, ignorar o próprio estabelecimento
    if (estabelecimentoId) {
      query = query.neq('id', estabelecimentoId);
    }
    
    const { data, error } = await query.single();
    
    // Se não encontrou (PGRST116), significa que não existe
    if (error && error.code === 'PGRST116') {
      return false;
    }
    
    // Se encontrou, existe
    return !!data;
  } catch (error) {
    logger.error('Erro ao verificar existência de slug:', error);
    return true; // Em caso de erro, assumir que existe (segurança)
  }
}

/**
 * Gera slug único, resolvendo conflitos automaticamente
 * 
 * @param nomeEstabelecimento - Nome do estabelecimento
 * @param estabelecimentoId - ID do estabelecimento (opcional, para updates)
 * @returns Slug único válido
 * 
 * @example
 * const slug = await gerarSlugUnico("Salão Emily Borges");
 * // Resultado: "salao-emily-borges" ou "salao-emily-borges-2" se já existir
 */
export async function gerarSlugUnico(
  nomeEstabelecimento: string,
  estabelecimentoId?: string
): Promise<string> {
  try {
    // Gerar slug base
    const slugBase = gerarSlugBase(nomeEstabelecimento);
    
    // Validar formato
    if (!validarSlug(slugBase)) {
      throw new Error(`Slug base inválido: ${slugBase}`);
    }
    
    let slugCandidato = slugBase;
    let contador = 1;
    const maxTentativas = 1000;
    
    // Tentar até encontrar um slug disponível
    while (await slugJaExiste(slugCandidato, estabelecimentoId)) {
      contador++;
      slugCandidato = `${slugBase}-${contador}`;
      
      // Proteção contra loop infinito
      if (contador > maxTentativas) {
        // Usar timestamp como fallback
        const timestamp = Date.now().toString().slice(-8);
        slugCandidato = `${slugBase}-${timestamp}`;
        logger.warn(`Muitas tentativas para gerar slug. Usando timestamp: ${slugCandidato}`);
        break;
      }
    }
    
    logger.debug(`Slug gerado: ${slugCandidato} (tentativas: ${contador})`);
    return slugCandidato;
  } catch (error) {
    logger.error('Erro ao gerar slug único:', error);
    throw error;
  }
}

/**
 * Obter estabelecimento por slug
 * 
 * @param slug - Slug do estabelecimento
 * @returns Dados do estabelecimento ou null
 */
export async function buscarEstabelecimentoPorSlug(slug: string) {
  try {
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error('Erro ao buscar estabelecimento por slug:', error);
    return null;
  }
}

/**
 * Atualizar slug de um estabelecimento
 * 
 * @param estabelecimentoId - ID do estabelecimento
 * @param novoNome - Novo nome (será usado para gerar novo slug)
 * @returns Novo slug gerado
 */
export async function atualizarSlug(
  estabelecimentoId: string,
  novoNome: string
): Promise<string | null> {
  try {
    // Gerar novo slug único
    const novoSlug = await gerarSlugUnico(novoNome, estabelecimentoId);
    
    // Atualizar no banco
    const { error } = await supabase
      .from('estabelecimentos')
      .update({ slug: novoSlug })
      .eq('id', estabelecimentoId);
    
    if (error) throw error;
    
    logger.info(`Slug atualizado: ${novoSlug} (estabelecimento: ${estabelecimentoId})`);
    return novoSlug;
  } catch (error) {
    logger.error('Erro ao atualizar slug:', error);
    return null;
  }
}
