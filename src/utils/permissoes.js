/**
 * CONFIGURAÇÃO DE PERMISSÕES DO SISTEMA
 * 
 * Tipos de Empresa:
 * - ME (0): Microempresa
 * - MEI (1): Microempreendedor Individual
 * 
 * Níveis de Acesso:
 * - 0: Visualizador (apenas visualiza e baixa)
 * - 1: Gerente (vê e insere informações)
 * - 2: ADM/Administrador (acesso total + upload de documentos)
 */

// Definição das abas por tipo de empresa
const ABAS_POR_TIPO = {
    ME: ['Dashboard', 'Documentos', 'Impostos', 'Faturamento', 'Caixa', 'Prazos', 'Perfil'],
    MEI: ['Dashboard', 'Imposto (DAS)', 'Notas Emitidas', 'Controle Mensal']
};

// Mapeamento de operações por nível de acesso
const OPERACOES_PERMITIDAS = {
    // Visualizador (0)
    0: {
        documentos: ['visualizar', 'download'],
        impostos: ['visualizar'],
        faturamento: ['visualizar'],
        caixa: ['visualizar'],
        prazos: ['visualizar'],
        perfil: ['visualizar'],
        contraoleMensal: ['visualizar'],
        notasEmitidas: ['visualizar']
    },

    // Gerente (1)
    1: {
        documentos: ['visualizar', 'download', 'criar'],
        impostos: ['visualizar', 'editar'],
        faturamento: ['visualizar', 'editar', 'criar'],
        caixa: ['visualizar', 'editar', 'criar'],
        prazos: ['visualizar', 'editar', 'criar'],
        perfil: ['visualizar', 'editar'],
        contraoleMensal: ['visualizar', 'editar', 'criar'],
        notasEmitidas: ['visualizar', 'editar', 'criar'],
        empresa: ['visualizar', 'editar']
    },

    // Administrador (2)
    2: {
        documentos: ['visualizar', 'download', 'upload', 'editar', 'deletar'],
        impostos: ['visualizar', 'editar', 'deletar'],
        faturamento: ['visualizar', 'editar', 'criar', 'deletar'],
        caixa: ['visualizar', 'editar', 'criar', 'deletar'],
        prazos: ['visualizar', 'editar', 'criar', 'deletar'],
        perfil: ['visualizar', 'editar'],
        contraoleMensal: ['visualizar', 'editar', 'criar', 'deletar'],
        notasEmitidas: ['visualizar', 'editar', 'criar', 'deletar'],
        empresa: ['visualizar', 'editar', 'deletar'],
        admin: ['visualizar_resumo', 'gerenciar_usuarios']
    }
};

/**
 * Verifica se um usuário tem permissão para realizar uma operação
 * @param {number} nivel - Nível de acesso do usuário (0, 1, 2)
 * @param {string} modulo - Módulo a ser acessado (documentos, impostos, etc)
 * @param {string} operacao - Operação a ser realizada (visualizar, editar, etc)
 * @returns {boolean} true se tem permissão, false caso contrário
 */
function temPermissao(nivel, modulo, operacao) {
    const operacoesDoUsuario = OPERACOES_PERMITIDAS[nivel];
    
    if (!operacoesDoUsuario) {
        return false;
    }

    const operacoesDoModulo = operacoesDoUsuario[modulo];
    
    if (!operacoesDoModulo) {
        return false;
    }

    return operacoesDoModulo.includes(operacao);
}

/**
 * Retorna as abas disponíveis para um tipo de empresa
 * @param {number} tipoEmpresa - 0 para ME, 1 para MEI
 * @returns {Array} Array com as abas disponíveis
 */
function getAbasDisponiveis(tipoEmpresa) {
    return tipoEmpresa === 0 ? ABAS_POR_TIPO.ME : ABAS_POR_TIPO.MEI;
}

/**
 * Retorna as operações disponíveis para um nível de acesso
 * @param {number} nivel - Nível de acesso (0, 1, 2)
 * @returns {Object} Objeto com as operações disponíveis
 */
function getOperacoes(nivel) {
    return OPERACOES_PERMITIDAS[nivel] || {};
}

module.exports = {
    ABAS_POR_TIPO,
    OPERACOES_PERMITIDAS,
    temPermissao,
    getAbasDisponiveis,
    getOperacoes
};
