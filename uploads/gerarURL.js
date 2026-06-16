const fse = require('fs-extra');
const path = require('path');
const { URL } = require('url');

const PUBLIC_ROOT_PATH = path.join(process.cwd(), 'public');
const UPLOADS_ROOT_PATH = path.join(process.cwd(), 'uploads');
const API_URL = process.env.API_BASE_URL || 'http://localhost:3333';

//@returns {string} A URL completa e formatada
function gerarURL(nomeArquivo, pasta, arquivoPadrao) {
    const arquivoVerificar = nomeArquivo || arquivoPadrao;
    const arquivoNormalizado = path.normalize(arquivoVerificar || '');

    if (path.isAbsolute(arquivoNormalizado)) {
        const rel = `/${path.relative(process.cwd(), arquivoNormalizado).replace(/\\/g, '/')}`;
        try {
            return new URL(rel, API_URL).href;
        } catch (err) {
            return `${API_URL}${rel}`;
        }
    }

    if (
        arquivoNormalizado.startsWith(`uploads${path.sep}`) ||
        arquivoNormalizado.startsWith('/uploads') ||
        arquivoNormalizado.includes(`uploads${path.sep}`)
    ) {
        const rel = `/${arquivoNormalizado.replace(/\\/g, '/')}`;
        try {
            return new URL(rel, API_URL).href;
        } catch (err) {
            return `${API_URL}${rel}`;
        }
    }

    const caminhoFisico = path.join(PUBLIC_ROOT_PATH, pasta, arquivoVerificar);

    let caminhoRelativo;

    if (nomeArquivo && fse.existsSync(caminhoFisico)) {
        caminhoRelativo = path.join('/public', pasta, nomeArquivo);
    } else {
        caminhoRelativo = path.join('/public', pasta, arquivoPadrao);
    }

    const caminhoRelativoFormatado = caminhoRelativo.replace(/\\/g, '/');

    const urlCompleta = new URL(caminhoRelativoFormatado, API_URL);

    return urlCompleta.href;
}

module.exports = { gerarURL };