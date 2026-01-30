#!/usr/bin/env node
/**
 * Teste para a função parseDataHoraLocal corrigida
 */

function parseDataHoraLocal(dataHoraISO) {
  try {
    if (!dataHoraISO || typeof dataHoraISO !== 'string') {
      console.log('❌ entrada inválida');
      return new Date();
    }

    // ✅ NOVO: Se vier com offset timezone, usar new Date() para conversão automática
    if (dataHoraISO.includes('+') || dataHoraISO.includes('Z') || 
        (dataHoraISO.includes('-') && dataHoraISO.indexOf('-') > 10)) {
      try {
        const dataConverted = new Date(dataHoraISO);
        if (!isNaN(dataConverted.getTime())) {
          return dataConverted; // ✅ Conversão automática!
        }
      } catch (e) {
        console.log('⚠️ erro ao converter');
      }
    }

    const [datePart, timePartRaw] = dataHoraISO.split('T');
    
    if (!datePart || !timePartRaw) {
      console.log('❌ formato inválido');
      return new Date();
    }

    const [ano, mes, dia] = datePart.split('-').map(Number);
    
    // 🔧 CORREÇÃO: Remover APENAS o timezone
    let timeClean = timePartRaw;
    const plusIndex = timePartRaw.indexOf('+');
    const minusIndex = timePartRaw.lastIndexOf('-');
    
    if (plusIndex > 0) {
      timeClean = timePartRaw.substring(0, plusIndex);
    } else if (minusIndex > 5) {
      timeClean = timePartRaw.substring(0, minusIndex);
    }
    
    const [hora, min, seg = 0] = timeClean.split(':').map(Number);
    
    if (isNaN(ano) || isNaN(mes) || isNaN(dia) || isNaN(hora) || isNaN(min)) {
      console.log('❌ valores NaN');
      return new Date();
    }
    
    const date = new Date(ano, mes - 1, dia, hora, min, seg);
    
    if (isNaN(date.getTime())) {
      console.log('❌ Date inválida');
      return new Date();
    }
    
    return date;
  } catch (error) {
    console.log('❌ erro:', error);
    return new Date();
  }
}

// ===== TESTES =====
console.log('🧪 TESTES DE parseDataHoraLocal\n');

// Teste 1: String com offset +00:00 (o que Supabase retorna)
console.log('Teste 1: String com +00:00 (UTC do Supabase)');
const teste1 = '2026-01-30T03:30:00+00:00';
const result1 = parseDataHoraLocal(teste1);
console.log(`  Input:  ${teste1}`);
console.log(`  Output: ${result1.toLocaleString('pt-BR')}`);
console.log(`  Hora:   ${result1.getHours()}:${String(result1.getMinutes()).padStart(2, '0')}`);
console.log(`  Result: ${result1.getHours() === 0 && result1.getMinutes() === 30 ? '✅ CORRETO' : '❌ ERRADO'}\n`);

// Teste 2: String com offset -03:00 (o que a gente salva)
console.log('Teste 2: String com -03:00 (BRT)');
const teste2 = '2026-01-30T00:30:00-03:00';
const result2 = parseDataHoraLocal(teste2);
console.log(`  Input:  ${teste2}`);
console.log(`  Output: ${result2.toLocaleString('pt-BR')}`);
console.log(`  Hora:   ${result2.getHours()}:${String(result2.getMinutes()).padStart(2, '0')}`);
console.log(`  Result: ${result2.getHours() === 0 && result2.getMinutes() === 30 ? '✅ CORRETO' : '❌ ERRADO'}\n`);

// Teste 3: String sem offset (parse manual)
console.log('Teste 3: String sem offset (parse manual)');
const teste3 = '2026-01-30T00:30:00';
const result3 = parseDataHoraLocal(teste3);
console.log(`  Input:  ${teste3}`);
console.log(`  Output: ${result3.toLocaleString('pt-BR')}`);
console.log(`  Hora:   ${result3.getHours()}:${String(result3.getMinutes()).padStart(2, '0')}`);
console.log(`  Result: ${result3.getHours() === 0 && result3.getMinutes() === 30 ? '✅ CORRETO' : '❌ ERRADO'}\n`);

// Teste 4: String com Z (UTC Zulu)
console.log('Teste 4: String com Z (UTC)');
const teste4 = '2026-01-30T03:30:00Z';
const result4 = parseDataHoraLocal(teste4);
console.log(`  Input:  ${teste4}`);
console.log(`  Output: ${result4.toLocaleString('pt-BR')}`);
console.log(`  Hora:   ${result4.getHours()}:${String(result4.getMinutes()).padStart(2, '0')}`);
console.log(`  Result: ${result4.getHours() === 0 && result4.getMinutes() === 30 ? '✅ CORRETO' : '❌ ERRADO'}`);
