 /**
 * @fileoverview Middlewares de Autenticação e Autorização
 * Gerencia validação de usuários, empresas e permissões de acesso
 */

const db = require('../dataBase/connection');

/**
 * Middleware de Autenticação
 * Valida se o usuário está autenticado e associado à empresa
 *
 * Formato esperado do header Authorization:
 * Authorization: '{"usuarioId": 1, "empresaId": 5}'
 *
 * @param {Object} request - Express request object
 * @param {string} request.headers.authorization - JSON com usuarioId e empresaId
 * @param {Object} response - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const autenticar = async (request, response, next) => {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            return response.status(401).json({
                sucesso: false,
                mensagem: 'Token de autenticação não fornecido',
                dados: null
            });
        }

        // Parse do JSON contendo usuarioId e empresaId
        const auth = JSON.parse(authHeader);
        const { usuarioId, empresaId } = auth;

        if (!usuarioId || !empresaId) {
            return response.status(401).json({
                sucesso: false,
                mensagem: 'usuarioId ou empresaId inválidos',
                dados: null
            });
        }

        // Valida existência e status do usuário
        const [usuarios] = await db.query(
            'SELECT usu_id, usu_nome FROM USUARIOS WHERE usu_id = ? AND usu_status = 1',
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return response.status(401).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado ou inativo',
                dados: null
            });
        }

        // Valida existência e status contábil da empresa
        const [empresas] = await db.query(
            'SELECT emp_id, emp_tipo, emp_nome_fantasia, CAST(emp_status AS UNSIGNED) AS emp_status FROM EMPRESAS WHERE emp_id = ?',
            [empresaId]
        );

        if (empresas.length === 0) {
            return response.status(401).json({
                sucesso: false,
                mensagem: 'Empresa não encontrada no sistema',
                dados: null
            });
        }

        const statusEmpresa = empresas[0].emp_status;

        // Status 0 = Inativa, 2 = Inapta (bloqueada)
        if (statusEmpresa === 0) {
            return response.status(403).json({
                sucesso: false,
                mensagem: 'Acesso negado: Esta empresa encontra-se INATIVA',
                dados: null
            });
        }

        if (statusEmpresa === 2) {
            return response.status(403).json({
                sucesso: false,
                mensagem: 'Acesso bloqueado: Esta empresa está INAPTA. Regularize as omissões fiscais',
                dados: null
            });
        }

        // Valida vínculo ativo do usuário com a empresa
        const [vinculos] = await db.query(`
            SELECT 
                CAST (usu_emp_nivel_acesso AS UNSIGNED) AS usu_emp_nivel_acesso,
                usu_emp_data_vinculo,
                CAST (usu_emp_status AS UNSIGNED) AS usu_emp_status
            FROM USUARIO_EMPRESAS
            WHERE usu_id = ? AND emp_id = ? AND usu_emp_status = 1
        `, [usuarioId, empresaId]);

        if (vinculos.length === 0) {
            return response.status(403).json({
                sucesso: false,
                mensagem: 'Usuário não tem permissão para acessar esta empresa',
                dados: null
            });
        }

        // Armazena informações de autenticação no request para uso posterior
        request.usuario = {
            id: usuarioId,
            nome: usuarios[0].usu_nome
        };

        request.empresa = {
            id: empresaId,
            tipo: Number(empresas[0].emp_tipo), // 0 = ME, 1 = MEI
            nome: empresas[0].emp_nome_fantasia
        };

        request.acesso = {
            nivel: Number(vinculos[0].usu_emp_nivel_acesso) // 0 = Visualizador, 1 = Gerente, 2 = ADM
        };

        // Disponibiliza informações para middlewares e controllers
        request.nivelAcesso = Number(vinculos[0].usu_emp_nivel_acesso);
        request.tipoEmpresa = Number(empresas[0].emp_tipo);

        next();

    } catch (error) {
        return response.status(401).json({
            sucesso: false,
            mensagem: 'Erro na autenticação',
            dados: null
        });
    }
};

/**
 * Middleware de Autorização por Nível de Acesso
 * Verifica se o usuário tem o nível mínimo de permissão
 *
 * Níveis de acesso:
 * - 0: Visualizador (apenas leitura)
 * - 1: Gerente (leitura e escrita)
 * - 2: Administrador (acesso total)
 *
 * @param {number[]} niveisPermitidos - Array com níveis permitidos (ex: [1, 2])
 * @returns {Function} Middleware function
 */
const autorizar = (niveisPermitidos) => {
    return (request, response, next) => {
        const nivel = request.nivelAcesso;

        if (!niveisPermitidos.includes(nivel)) {
            return response.status(403).json({
                sucesso: false,
                mensagem: 'Você não tem permissão para realizar esta ação',
                dados: null
            });
        }

        next();
    };
};

/**
 * Middleware para validar permissões por tipo de empresa e nível de acesso
 * Define quem pode fazer cada operação com base no tipo de empresa
 *
 * Tipos de empresa:
 * - 0: ME (Microempresa)
 * - 1: MEI (Microempreendedor Individual)
 *
 * @param {string} operacao - Código da operação a validar
 * @returns {Function} Middleware function
 */
const validarPermissao = (operacao) => {
    return (request, response, next) => {
        const tipoEmpresa = request.tipoEmpresa; // 0 = ME, 1 = MEI
        const nivel = request.nivelAcesso; // 0 = Visualizador, 1 = Gerente, 2 = ADM

        // Mapeamento centralizado de permissões por operação
        const permissoes = {
            // Documentos
            'upload_documento': [2],
            'download_documento': [0, 1, 2],
            'visualizar_documento': [0, 1, 2],

            // Empresa
            'editar_empresa': [1, 2],
            'inserir_dados': [1, 2],

            // Dashboard e Visualizações
            'ver_dashboard': [0, 1, 2],
            'ver_impostos': [0, 1, 2],
            'ver_faturamento': [0, 1, 2],

            // Recursos específicos por tipo de empresa
            'ver_caixa': tipoEmpresa === 0 ? [0, 1, 2] : [],
            'ver_prazos': tipoEmpresa === 0 ? [0, 1, 2] : [],
            'ver_perfil': tipoEmpresa === 0 ? [0, 1, 2] : [],
            'ver_controle_mensal': tipoEmpresa === 1 ? [0, 1, 2] : []
        };

        const niveisPermitidos = permissoes[operacao] || [];

        if (!niveisPermitidos.includes(nivel)) {
            return response.status(403).json({
                sucesso: false,
                mensagem: 'Você não tem permissão para acessar este recurso',
                dados: null
            });
        }

        next();
    };
};

module.exports = {
    autenticar,
    autorizar,
    validarPermissao
};
