/**
 * Utilitários para manipulação de timezone
 * Garante que agendamentos sejam salvos/lidos no fuso horário local (BRT)
 * sem conversão UTC que causa diferença de 3 horas
 */

/**
 * Converte Date para string ISO com offset de timezone local
 * Exemplo: "2026-01-29T19:00:00-03:00" (BRT)
 * @param date Objeto Date no horário local
 * @returns String ISO com offset de timezone
 */
export function toISOStringWithTimezone(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  const hora = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const seg = String(date.getSeconds()).padStart(2, '0');

  // Calcular offset de timezone (ex: -180 minutos = -03:00)
  const offsetMinutosTotal = date.getTimezoneOffset();
  const offsetSinal = offsetMinutosTotal > 0 ? '-' : '+';
  const offsetHoras = String(Math.floor(Math.abs(offsetMinutosTotal) / 60)).padStart(2, '0');
  const offsetMinutos = String(Math.abs(offsetMinutosTotal) % 60).padStart(2, '0');
  const offsetString = `${offsetSinal}${offsetHoras}:${offsetMinutos}`;

  return `${ano}-${mes}-${dia}T${hora}:${min}:${seg}${offsetString}`;
}

/**
 * Converte string ISO para Date no horário local
 * 🔧 CORREÇÃO: Agora suporta offset timezone e converte automaticamente
 * Exemplos:
 * - "2026-01-30T00:30:00+00:00" (UTC do banco) → converte para BRT
 * - "2026-01-30T00:30:00-03:00" (BRT) → mantém como local
 * - "2026-01-30T00:30:00" (sem offset) → assume local
 * 
 * @param isoString String ISO com ou sem timezone
 * @returns Date no horário local da máquina
 */
export function parseISOStringLocal(isoString: string): Date {
  if (!isoString) {
    throw new Error('Data ISO inválida: string vazia');
  }

  // ✅ NOVO: Tentar fazer parse direto da string ISO
  // new Date() já faz conversão automática de UTC para horário local
  try {
    const date = new Date(isoString);
    if (!isNaN(date.getTime())) {
      return date; // ✅ Conversão automática funcionou!
    }
  } catch (e) {
    // Se falhar, tentar parse manual abaixo
  }

  // Fallback: Parse manual para strings que new Date() não consegue processar
  // Remover timezone se existir (ex: "+00:00" ou "-03:00")
  const cleanString = isoString.split('+')[0].split('Z')[0];
  const [datePart, timePartRaw] = cleanString.split('T');
  
  if (!datePart) {
    throw new Error(`Data ISO inválida: formato incorreto (${isoString})`);
  }

  const [ano, mes, dia] = datePart.split('-').map(Number);
  
  if (!ano || !mes || !dia) {
    throw new Error(`Data ISO inválida: ano/mês/dia ausentes (${isoString})`);
  }

  // Extrair hora/minuto/seg removendo qualquer offset
  let hora = 0, min = 0, seg = 0;
  if (timePartRaw) {
    // Remover caracteres não-numéricos após os segundos
    const timeClean = timePartRaw.split('-')[0]; // Remove "-XX:XX" do final
    const timeParts = timeClean.split(':').map(Number);
    hora = timeParts[0] || 0;
    min = timeParts[1] || 0;
    seg = Math.floor((timeParts[2] || 0)); // Remover decimais
  }

  return new Date(ano, mes - 1, dia, hora, min, seg);
}

/**
 * Cria uma data no horário local e converte para string ISO com timezone BRT
 * CORRIGIDO: Retorna formato COM offset -03:00 para salvar corretamente no Postgres timestamptz
 * @param ano Ano (ex: 2026)
 * @param mes Mês (1-12)
 * @param dia Dia (1-31)
 * @param hora Hora (0-23)
 * @param minuto Minuto (0-59)
 * @param segundo Segundo (0-59) - opcional
 * @returns String ISO com timezone local (-03:00 para BRT)
 */
export function createLocalISOString(
  ano: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  segundo: number = 0
): string {
  // 🔧 CORREÇÃO: Usar a mesma lógica de toISOStringWithTimezone
  // Cria Date e deixa a função calcular o offset corretamente
  const date = new Date(ano, mes - 1, dia, hora, minuto, segundo);
  return toISOStringWithTimezone(date);
}

/**
 * Retorna o início do dia no horário local (00:00:00)
 * @param date Data de referência (opcional, padrão: hoje)
 * @returns String ISO com offset de timezone
 */
export function getStartOfDayLocal(date: Date = new Date()): string {
  const inicio = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  return toISOStringWithTimezone(inicio);
}

/**
 * Retorna o fim do dia no horário local (23:59:59)
 * @param date Data de referência (opcional, padrão: hoje)
 * @returns String ISO com offset de timezone
 */
export function getEndOfDayLocal(date: Date = new Date()): string {
  const fim = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  return toISOStringWithTimezone(fim);
}

/**
 * Retorna o início do mês no horário local
 * @param ano Ano (ex: 2026)
 * @param mes Mês (1-12)
 * @returns String ISO com offset de timezone
 */
export function getStartOfMonthLocal(ano: number, mes: number): string {
  return toISOStringWithTimezone(new Date(ano, mes - 1, 1, 0, 0, 0));
}

/**
 * Retorna o fim do mês no horário local
 * @param ano Ano (ex: 2026)
 * @param mes Mês (1-12)
 * @returns String ISO com offset de timezone
 */
export function getEndOfMonthLocal(ano: number, mes: number): string {
  // Último dia do mês
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return toISOStringWithTimezone(new Date(ano, mes - 1, ultimoDia, 23, 59, 59));
}

/**
 * Adiciona minutos a uma data e retorna string ISO com timezone
 * @param date Data base
 * @param minutos Minutos a adicionar (pode ser negativo)
 * @returns String ISO com offset de timezone
 */
export function addMinutesLocal(date: Date, minutos: number): string {
  const novaData = new Date(date.getTime() + minutos * 60 * 1000);
  return toISOStringWithTimezone(novaData);
}
