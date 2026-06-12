const fse = require('fs-extra');
const path = require('path');
const { URL } = require('url'); //Módulo nativo do Node.js para trbalhar com URLs

const PUBLIC_ROOT_PATH = path.join(process.cwd(), 'public');
const API_URL = process.env.API_URL || 'http://localhost:3333';

//@returns {string} A URL completa e formatada

function gerarURL(nomeArquivo, pasta, arquivoPadrao) {
    const arquivoVerificar = nomeArquivo || arquivoPadrao;
    const caminhoFisico = path.join(PUBLIC_ROOT_PATH, pasta, arquivoVerificar);

    let caminhoRelativo;

    if (nomeArquivo && fse.existsSync(caminhoFisico)) {
        // usa o caminho para esse arquivo
        caminhoRelativo = path.join ('/public', pasta, nomeArquivo);
    } else {
        caminhoRelativo = path.join('/public', pasta, arquivoPadrao);
    }

    //garante que o caminho relativo use barras '/'
    const caminhoRelativoFormatado = caminhoRelativo.replace(/\\/g, '/');

    //constrói a URL completa de forma segura, evitando barras duplas (//)
    const urlCompleta = new URL (caminhoRelativoFormatado, API_URL);

    return urlCompleta.href;
}

//Exporte a nova função
module.exports = { gerarURL };