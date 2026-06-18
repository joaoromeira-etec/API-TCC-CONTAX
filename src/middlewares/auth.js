const db = require('../dataBase/connection');

/**
 * Middleware de Autenticação - Valida se o usuário está autenticado
 * Espera receber: { usuarioId, empresaId } no header 'Authorization' como JSON
 * 
 * Exemplo de uso no frontend:
 * Authorization: '{"usuarioId": 1, "empresaId": 5}'
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

        // Valida se o usuário existe e está ativo
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

        // Valida se a empresa existe e está ativa
        const [empresas] = await db.query(
            'SELECT emp_id, emp_tipo, emp_nome_fantasia FROM EMPRESAS WHERE emp_id = ? AND emp_status = 1',
            [empresaId]
        );

        if (empresas.length === 0) {
            return response.status(401).json({
                sucesso: false,
                mensagem: 'Empresa não encontrada ou inativa',
                dados: null
            });
        }

        // Valida se o usuário tem vínculo ativo com a empresa
        const [vinculos] = await db.query(
            `SELECT 
                usu_emp_nivel_acesso, 
                usu_emp_data_vinculo,
                usu_emp_status 
            FROM USUARIO_EMPRESAS 
            WHERE usu_id = ? AND emp_id = ? AND usu_emp_status = 1`,
            [usuarioId, empresaId]
        );

        if (vinculos.length === 0) {
            return response.status(403).json({
                sucesso: false,
                mensagem: 'Usuário não tem permissão para acessar esta empresa',
                dados: null
            });
        }

        // Armazena as informações no objeto request para usar depois
        request.usuario = {
            id: usuarioId,
            nome: usuarios[0].usu_nome
        };

        request.empresa = {
            id: empresaId,
            tipo: empresas[0].emp_tipo, // 0 = ME, 1 = MEI
            nome: empresas[0].emp_nome_fantasia
        };

        request.acesso = {
            nivel: vinculos[0].usu_emp_nivel_acesso // 0 = Visualizador, 1 = Gerente, 2 = ADM
        };

        // Disponibiliza o tipo de empresa para funções auxiliares
        request.nivelAcesso = vinculos[0].usu_emp_nivel_acesso;
        request.tipoEmpresa = empresas[0].emp_tipo;

        next();

    } catch (error) {
        return response.status(401).json({
            sucesso: false,
            mensagem: `Erro na autenticação: ${error.message}`,
            dados: null
        });
    }
};

/**
 * Middleware de Autorização - Verifica se o usuário tem permissão para acessar um recurso
 * @param {Array} nivelPermitido - Array com níveis permitidos (ex: [1, 2] para Gerente e ADM)
 */
const autorizar = (nivelPermitido) => {
    return (request, response, next) => {
        const nivel = request.nivelAcesso;

        if (!nivelPermitido.includes(nivel)) {
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
 * Define quem pode fazer cada operação
 */
const validarPermissao = (operacao) => {
    return (request, response, next) => {
        const tipoEmpresa = request.tipoEmpresa; // 0 = ME, 1 = MEI
        const nivel = request.nivelAcesso; // 0 = Visualizador, 1 = Gerente, 2 = ADM

        // Mapeamento de permissões
        const permissoes = {
            // Upload de documentos - apenas ADM
            'upload_documento': [2],

            // Download/visualização de documentos - ADM, Gerente e Visualizador
            'download_documento': [0, 1, 2],
            'visualizar_documento': [0, 1, 2],

            // Editar informações da empresa - apenas Gerente e ADM
            'editar_empresa': [1, 2],

            // Ver e inserir informações - Gerente e ADM
            'inserir_dados': [1, 2],

            // Dashboard - todos os níveis
            'ver_dashboard': [0, 1, 2],

            // Impostos - para ME todos, para MEI todos
            'ver_impostos': [0, 1, 2],

            // Faturamento - para ME todos, para MEI apenas notas emitidas
            'ver_faturamento': [0, 1, 2],

            // Caixa - para ME todos
            'ver_caixa': tipoEmpresa === 0 ? [0, 1, 2] : [],

            // Prazos - para ME todos
            'ver_prazos': tipoEmpresa === 0 ? [0, 1, 2] : [],

            // Perfil - para ME todos
            'ver_perfil': tipoEmpresa === 0 ? [0, 1, 2] : [],

            // Controle Mensal - para MEI todos
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
