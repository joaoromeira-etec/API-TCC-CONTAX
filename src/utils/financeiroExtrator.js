const fs = require('fs');
const pdf = require('pdf-parse');

const CATEGORIAS_POR_TIPO = [
  { matcher: /DAS/i, categoria: 'Imposto' },
  { matcher: /NFS[-\s]?e|NFS/i, categoria: 'Faturamento' },
  { matcher: /DANFE/i, categoria: 'Faturamento' }
];

function normalizarTexto(texto) {
  return texto.replace(/\s+/g, ' ').trim();
}

function parseValor(texto) {
  const matches = [...texto.matchAll(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g)];
  if (matches.length) {
    const ultimo = matches[matches.length - 1][1];
    return Number(ultimo.replace(/\./g, '').replace(',', '.'));
  }

  const simpleMatch = texto.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/);
  if (simpleMatch) {
    return Number(simpleMatch[1].replace(/\./g, '').replace(',', '.'));
  }

  return null;
}

function parseData(texto) {
  const matches = texto.match(/\b(\d{2}\/\d{2}\/\d{4})\b/g);
  if (!matches || matches.length === 0) {
    return null;
  }
  return matches[0];
}

function identificarCategoria(nomeArquivo, tipoDescricao, texto) {
  const source = `${nomeArquivo || ''} ${tipoDescricao || ''} ${texto || ''}`;
  const encontrado = CATEGORIAS_POR_TIPO.find((item) => item.matcher.test(source));
  return encontrado ? encontrado.categoria : 'Faturamento';
}

async function extrairTextoPDF(caminhoArquivo) {
  const buffer = fs.readFileSync(caminhoArquivo);
  const data = await pdf(buffer);
  return normalizarTexto(data.text || '');
}

async function extrairDadosFinanceiros(caminhoArquivo, nomeArquivo, tipoDescricao) {
  const texto = await extrairTextoPDF(caminhoArquivo);
  const valor = parseValor(texto);
  const data_emissao = parseData(texto);
  const fin_categoria = identificarCategoria(nomeArquivo, tipoDescricao, texto);

  return {
    fin_valor_total: valor,
    fin_categoria,
    fin_data_emissao: data_emissao || null,
    texto_extraido: texto
  };
}

module.exports = { extrairDadosFinanceiros };
