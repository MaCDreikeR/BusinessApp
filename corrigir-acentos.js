const fs = require('fs');
const path = require('path');

// Mapa de correção: Caractere quebrado -> Caractere correto
const correcoes = {
  "Ã¡": "á", "Ã¢": "â", "Ã£": "ã", "Ã ": "à",
  "Ã©": "é", "Ãª": "ê",
  "Ã­": "í", // i com acento
  "Ã³": "ó", "Ã´": "ô", "Ãµ": "õ",
  "Ãº": "ú",
  "Ã§": "ç",
  "Ã": "Á", "Ã‚": "Â", "Ãƒ": "Ã", "Ã€": "À",
  "Ã‰": "É", "ÃŠ": "Ê",
  "Ã": "Í",
  "Ã“": "Ó", "Ã”": "Ô", "Ã•": "Õ",
  "Ãš": "Ú",
  "Ã‡": "Ç",
  "Ãº": "ú"
};

// Pastas que ele vai varrer (adicione outras se necessário, evite node_modules)
const pastasParaVerificar = ['app', 'components', 'constants', 'contexts', 'hooks', 'types', 'utils'];

function processarArquivo(caminho) {
  let conteudo = fs.readFileSync(caminho, 'utf8');
  let alterado = false;

  for (const [erro, correcao] of Object.entries(correcoes)) {
    if (conteudo.includes(erro)) {
      // Substitui todas as ocorrências
      conteudo = conteudo.split(erro).join(correcao);
      alterado = true;
    }
  }

  if (alterado) {
    fs.writeFileSync(caminho, conteudo, 'utf8');
    console.log(`Corrigido: ${caminho}`);
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

console.log('Iniciando correção de acentos...');
pastasParaVerificar.forEach(pasta => {
  lerDiretorio(path.join(__dirname, pasta));
});
console.log('Correção finalizada!');