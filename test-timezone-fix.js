#!/usr/bin/env node
/**
 * Script para testar a correção de timezone
 * Simula o fluxo: criar agendamento → salvar → recuperar → exibir
 */

// Simular as funções corrigidas
function toISOStringWithTimezone(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  const hora = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const seg = String(date.getSeconds()).padStart(2, '0');
  
  const offsetMinutosTotal = date.getTimezoneOffset();
  const offsetSinal = offsetMinutosTotal > 0 ? '-' : '+';
  const offsetHoras = String(Math.floor(Math.abs(offsetMinutosTotal) / 60)).padStart(2, '0');
  const offsetMinutos = String(Math.abs(offsetMinutosTotal) % 60).padStart(2, '0');
  const offsetString = `${offsetSinal}${offsetHoras}:${offsetMinutos}`;

  return `${ano}-${mes}-${dia}T${hora}:${min}:${seg}${offsetString}`;
}

function createLocalISOString(ano, mes, dia, hora, minuto, segundo = 0) {
  const date = new Date(ano, mes - 1, dia, hora, minuto, segundo);
  return toISOStringWithTimezone(date);
}

function parseISOStringLocal(isoString) {
  if (!isoString) {
    throw new Error('Data ISO inválida: string vazia');
  }

  // ✅ NOVO: Tentar fazer parse direto da string ISO
  try {
    const date = new Date(isoString);
    if (!isNaN(date.getTime())) {
      return date; // ✅ Conversão automática funcionou!
    }
  } catch (e) {
    // Se falhar, tentar parse manual abaixo
  }

  // Fallback: Parse manual
  const cleanString = isoString.split('+')[0].split('Z')[0];
  const [datePart, timePartRaw] = cleanString.split('T');
  
  if (!datePart) {
    throw new Error(`Data ISO inválida: formato incorreto (${isoString})`);
  }

  const [ano, mes, dia] = datePart.split('-').map(Number);
  
  if (!ano || !mes || !dia) {
    throw new Error(`Data ISO inválida: ano/mês/dia ausentes (${isoString})`);
  }

  let hora = 0, min = 0, seg = 0;
  if (timePartRaw) {
    const timeClean = timePartRaw.split('-')[0];
    const timeParts = timeClean.split(':').map(Number);
    hora = timeParts[0] || 0;
    min = timeParts[1] || 0;
    seg = Math.floor((timeParts[2] || 0));
  }

  return new Date(ano, mes - 1, dia, hora, min, seg);
}

// ===== TESTES =====
console.log('🧪 TESTES DE TIMEZONE\n');

// Teste 1: Criar agendamento
console.log('1️⃣  CRIANDO agendamento para 30/01/2026 00:30');
const dataLocal = createLocalISOString(2026, 1, 30, 0, 30);
console.log(`   ✅ String criada: ${dataLocal}`);

// Teste 2: Simular salvamento no banco
console.log('\n2️⃣  SALVANDO no banco PostgreSQL timestamptz');
console.log(`   Enviando para Postgres: ${dataLocal}`);
console.log(`   Postgres interpreta como: ${dataLocal.includes('-03:00') ? 'BRT (-03:00)' : 'UTC?'}`);
console.log(`   Postgres salva internamente em UTC: 2026-01-30T03:30:00Z`);

// Teste 3: Simular recuperação do banco (Supabase retorna em UTC)
console.log('\n3️⃣  RECUPERANDO do banco Supabase');
const dataRetornada = '2026-01-30T03:30:00+00:00'; // Isso é o que Supabase retorna
console.log(`   Supabase retorna: ${dataRetornada} (UTC)`);

// Teste 4: Parse local (com conversão automática)
console.log('\n4️⃣  PARSEANDO com parseISOStringLocal()');
const dateParsed = parseISOStringLocal(dataRetornada);
console.log(`   Data parseada: ${dateParsed.toLocaleString('pt-BR')}`);
console.log(`   Dia: ${dateParsed.getDate()}`);
console.log(`   Mês: ${dateParsed.getMonth() + 1}`);
console.log(`   Ano: ${dateParsed.getFullYear()}`);
console.log(`   Hora: ${dateParsed.getHours()}:${String(dateParsed.getMinutes()).padStart(2, '0')}`);

// Teste 5: Verificação final
console.log('\n5️⃣  VERIFICAÇÃO FINAL');
const diaEsperado = 30;
const mesEsperado = 1;
const anoEsperado = 2026;
const horaEsperada = 0;
const minEsperada = 30;

if (dateParsed.getDate() === diaEsperado && 
    dateParsed.getMonth() + 1 === mesEsperado && 
    dateParsed.getFullYear() === anoEsperado &&
    dateParsed.getHours() === horaEsperada &&
    dateParsed.getMinutes() === minEsperada) {
  console.log(`   ✅ SUCESSO! Data/hora corrigidas!`);
  console.log(`   Esperado: 30/01/2026 00:30`);
  console.log(`   Obtido:   ${dateParsed.getDate()}/${String(dateParsed.getMonth() + 1).padStart(2, '0')}/${dateParsed.getFullYear()} ${String(dateParsed.getHours()).padStart(2, '0')}:${String(dateParsed.getMinutes()).padStart(2, '0')}`);
} else {
  console.log(`   ❌ FALHA! Data/hora ainda incorreta`);
  console.log(`   Esperado: 30/01/2026 00:30`);
  console.log(`   Obtido:   ${dateParsed.getDate()}/${String(dateParsed.getMonth() + 1).padStart(2, '0')}/${dateParsed.getFullYear()} ${String(dateParsed.getHours()).padStart(2, '0')}:${String(dateParsed.getMinutes()).padStart(2, '0')}`);
}
