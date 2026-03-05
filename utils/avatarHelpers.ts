/**
 * Utilitários para renderização de avatares
 */

/**
 * Gera iniciais do nome completo
 * @param nome Nome completo (ex: "João Silva")
 * @returns Iniciais (ex: "JS")
 */
export function getInitials(nome: string): string {
  if (!nome) return '?';
  const parts = nome.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Gera cor consistente baseada no nome
 * @param nome Nome completo
 * @returns Cor em hexadecimal
 */
export function getAvatarColor(nome: string): string {
  const avatarColors = [
    '#FF6B6B', // Vermelho
    '#4ECDC4', // Turquesa
    '#45B7D1', // Azul claro
    '#FFA07A', // Salmão
    '#98D8C8', // Verde água
    '#F7DC6F', // Amarelo
    '#BB8FCE', // Roxo
    '#85C1E2', // Azul céu
    '#F8B195', // Pêssego
    '#C06C84', // Rosa escuro
  ];
  const index = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length;
  return avatarColors[index];
}

/**
 * Verifica se a data é hoje
 * @param date Data a verificar
 * @returns true se for hoje
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}
