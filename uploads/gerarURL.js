const fse = require('fs-extra');
const path = require('path');
const { URL } = require('url'); //Módulo nativo do Node.js para trbalhar com URLs

const PUBLIC_ROOT_PATH = path.join(process.cwd(), 'public');
const API_URL = process.env.API_URL || 'http://localhost:3333';

//@returns {string} A URL completa e formatada

function gerarURL(nomeArquivo, pasta, arquivoPadrao) {
    const arquivoVerificar = nomeArquivo || arquivoPadrao;
    const caminhoArquivo = path.join(PUBLIC_ROOT_PATH, pasta, arquivoVerificar);

    let caminhoRelativo;
}