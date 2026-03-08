const fs = require('fs');
const path = require('path');

// Dicionário de palavras quebradas mais comuns no seu app -> Palavra correta
const dicionario = {
  // Com Interrogação
  "Usu?rio": "Usuário", "Usu?rios": "Usuários", "usu?rio": "usuário",
  "Apar?ncia": "Aparência",
  "Notifica??es": "Notificações", "Notifica??o": "Notificação",
  "Neg?cio": "Negócio",
  "In?cio": "Início",
  "Servi?o": "Serviço", "Servi?os": "Serviços",
  "Relat?rio": "Relatório", "Relat?rios": "Relatórios",
  "Gest?o": "Gestão",
  "Sincroniza??o": "Sincronização",
  "Gr?tis": "Grátis",
  "Respons?vel": "Responsável",
  "A??o": "Ação", "A??es": "Ações",
  "Cria??o": "Criação", "cria??o": "criação",
  "Edi??o": "Edição",
  "Exclus?o": "Exclusão",
  "Hor?rio": "Horário", "Hor?rios": "Horários",
  "M?s": "Mês", "M?ses": "Meses",
  "Conclu?do": "Concluído",
  "Voc?": "Você",
  "N?o": "Não", "n?o": "não",
  "S?o": "São",
  "Padr?o": "Padrão",
  "Aten??o": "Atenção",
  "Informa??es": "Informações", "Informa??o": "Informação",
  "Atrav?s": "Através",
  "Autom?tico": "Automático", "Autom?tica": "Automática",
  "M?tricas": "Métricas", "M?trica": "Métrica",
  "Op??es": "Opções", "Op??o": "Opção",
  "Endere?o": "Endereço",
  "N?mero": "Número",
  "Frequ?ncia": "Frequência",
  "Hist?rico": "Histórico",
  "Funcion?rio": "Funcionário", "Funcion?rios": "Funcionários",
  "Cat?logo": "Catálogo",
  "F?sico": "Físico",
  "Comiss?o": "Comissão", "Comiss?es": "Comissões",
  "Pre?o": "Preço", "Pre?os": "Preços",
  "Descri??o": "Descrição",
  "Dura??o": "Duração",
  "Atribui??o": "Atribuição",
  "Cart?o": "Cartão", "Cart?es": "Cartões",
  "Cr?dito": "Crédito",
  "D?bito": "Débito",
  "Din?mico": "Dinâmico",
  "P?gina": "Página",
  "An?ncio": "Anúncio",
  "N?vel": "Nível",
  "Avan?ado": "Avançado",
  "B?sico": "Básico",
  "F?cil": "Fácil",
  "R?pido": "Rápido",
  "Gr?fico": "Gráfico", "Gr?ficos": "Gráficos",
  "L?quido": "Líquido",
  "Balan?o": "Balanço",
  "Or?amento": "Orçamento", "Or?amentos": "Orçamentos",
  "Amanh?": "Amanhã",
  "Cora??o": "Coração",

  // Variantes com o losango () caso o seu editor tenha salvo assim
  "Usurio": "Usuário", "Usurios": "Usuários", "Aparncia": "Aparência",
  "Notificaes": "Notificações", "Negcio": "Negócio", "Incio": "Início",
  "Servio": "Serviço", "Gesto": "Gestão", "Ao": "Ação", "No": "Não"
};

const pastasParaVerificar = ['app', 'components', 'constants', 'contexts', 'hooks', 'types', 'utils'];

function processarArquivo(caminho) {
  let conteudoOriginal = fs.readFileSync(caminho, 'utf8');
  let conteudo = conteudoOriginal;
  let alterado = false;

  for (const [erro, correcao] of Object.entries(dicionario)) {
    if (conteudo.includes(erro)) {
      // Substitui todas as ocorrências daquela palavra no arquivo
      conteudo = conteudo.split(erro).join(correcao);
      alterado = true;
    }
  }

  if (alterado) {
    fs.writeFileSync(caminho, conteudo, 'utf8');
    console.log(`✅ Corrigido: ${caminho}`);
  }
}

function lerDiretorio(diretorio) {
  if (!fs.existsSync(diretorio)) return;
  const arquivos = fs.readdirSync(diretorio);
  
  arquivos.forEach(arquivo => {
    const caminhoCompleto = path.join(diretorio, arquivo);
    const stat = fs.statSync(caminhoCompleto);
    
    if (stat.isDirectory()) {
      lerDiretorio(caminhoCompleto);
    } else if (stat.isFile() && (caminhoCompleto.endsWith('.ts') || caminhoCompleto.endsWith('.tsx') || caminhoCompleto.endsWith('.js'))) {
      processarArquivo(caminhoCompleto);
    }
  });
}

console.log('🔍 Iniciando correção inteligente de palavras...');
pastasParaVerificar.forEach(pasta => {
  lerDiretorio(path.join(__dirname, pasta));
});
console.log('🎉 Correção finalizada!');