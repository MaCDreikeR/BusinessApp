const fs = require('fs');
const path = require('path');

// Dicionário focado no losango negro de erro de enconding ()
const dicionario = {
  "Aparncia": "Aparência",
  "Notificaes": "Notificações",
  "notificaes": "notificações",
  "Notificao": "Notificação",
  "notificao": "notificação",
  "Negcio": "Negócio",
  "Incio": "Início",
  "Servio": "Serviço", 
  "Servios": "Serviços",
  "Relatrio": "Relatório", 
  "Relatrios": "Relatórios",
  "Gesto": "Gestão",
  "Sincronizao": "Sincronização",
  "sincronizao": "sincronização",
  "Grtis": "Grátis",
  "Responsvel": "Responsável",
  "Ao": "Ação", 
  "Aes": "Ações",
  "Criao": "Criação", 
  "criao": "criação",
  "Edio": "Edição",
  "Excluso": "Exclusão",
  "Horrio": "Horário", 
  "Horrios": "Horários",
  "Ms": "Mês",
  "Concludo": "Concluído",
  "Voc": "Você",
  "No": "Não", 
  "no": "não",
  "So": "São",
  "Padro": "Padrão",
  "Ateno": "Atenção",
  "Informaes": "Informações", 
  "Informao": "Informação",
  "Atravs": "Através",
  "Automtico": "Automático", 
  "Automtica": "Automática",
  "Mtricas": "Métricas", 
  "Mtrica": "Métrica",
  "Opes": "Opções", 
  "Opo": "Opção",
  "Endereo": "Endereço",
  "Nmero": "Número",
  "Frequncia": "Frequência",
  "Histrico": "Histórico",
  "Funcionrio": "Funcionário", 
  "Funcionrios": "Funcionários",
  "Catlogo": "Catálogo",
  "Fsico": "Físico",
  "Comisso": "Comissão", 
  "Comisses": "Comissões",
  "Preo": "Preço", 
  "Preos": "Preços",
  "Descrio": "Descrição",
  "Durao": "Duração",
  "Atribuio": "Atribuição",
  "Carto": "Cartão", 
  "Cartes": "Cartões",
  "Crdito": "Crédito",
  "Dbito": "Débito",
  "Dinmico": "Dinâmico",
  "Pgina": "Página",
  "Anncio": "Anúncio",
  "Nvel": "Nível",
  "Avanado": "Avançado",
  "Bsico": "Básico",
  "Fcil": "Fácil",
  "Rpido": "Rápido",
  "Grfico": "Gráfico", 
  "Grficos": "Gráficos",
  "Lquido": "Líquido",
  "Balano": "Balanço",
  "Oramento": "Orçamento", 
  "Oramentos": "Orçamentos",
  "Amanh": "Amanhã",
  "Corao": "Coração",
  "Usurio": "Usuário", 
  "Usurios": "Usuários", 
  "usurio": "usuário",
  "usurios": "usuários",
  "Estatsticas": "Estatísticas",
  "espao": "espaço",
  "Operaes": "Operações",
  "operaes": "operações",
  "Configuraes": "Configurações",
  "configuraes": "configurações",
  "Pblico": "Público",
  "ltima": "Última",
  "Vibrao": "Vibração",
  "Verso": "Versão",
  "possvel": "possível",
  "ir": "irá",
  "marcaes": "marcações",
  "Oramentos": "Orçamentos"
};

const pastasParaVerificar = ['app', 'components', 'constants', 'contexts', 'hooks', 'types', 'utils'];

function processarArquivo(caminho) {
  let conteudo = fs.readFileSync(caminho, 'utf8');
  let alterado = false;

  for (const [erro, correcao] of Object.entries(dicionario)) {
    if (conteudo.includes(erro)) {
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

console.log('🔍 Iniciando caça aos losangos ()...');
pastasParaVerificar.forEach(pasta => {
  lerDiretorio(path.join(__dirname, pasta));
});
console.log('🎉 Correção finalizada!');