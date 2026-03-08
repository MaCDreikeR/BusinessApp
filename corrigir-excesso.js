const fs = require('fs');
const path = require('path');

// Dicionário reverso para consertar apenas os estragos causados pelo "No" e "Ao"
const dicionario = {
  "Nãotifica": "Notifica",
  "notifica": "notifica",
  "Nãome": "Nome",
  "nãome": "nome",
  "Nãovo": "Novo",
  "novo": "novo",
  "Nãova": "Nova",
  "nova": "nova",
  "ReactNãode": "ReactNode",
  "Nãode": "Node",
  "Nãormal": "Normal",
  "nãormal": "normal",
  "Nãote": "Note",
  "Açãonde": "Aonde",
  "Açãos": "Aos",
  " Ação ": " Ao ",
  "Ação invés": "Ao invés"
};

const pastasParaVerificar = ['app', 'components', 'constants', 'contexts', 'hooks', 'types', 'utils'];

function processarArquivo(caminho) {
  let conteudo = fs.readFileSync(caminho, 'utf8');
  let alterado = false;

  for (const [erro, correcao] of Object.entries(dicionario)) {
    if (conteudo.includes(erro)) {
      // Desfaz a substituição errada
      conteudo = conteudo.split(erro).join(correcao);
      alterado = true;
    }
  }

  if (alterado) {
    fs.writeFileSync(caminho, conteudo, 'utf8');
    console.log(`🔧 Ajustado: ${caminho}`);
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

console.log('🧹 Limpando excessos do corretor...');
pastasParaVerificar.forEach(pasta => {
  lerDiretorio(path.join(__dirname, pasta));
});
console.log('✅ Limpeza finalizada!');