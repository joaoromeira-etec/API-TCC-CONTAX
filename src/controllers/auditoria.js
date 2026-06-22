/**
 * @fileoverview Controller de Auditoria
 * Gerencia registros de auditoria do sistema
 * Responsável por rastrear todas as ações executadas na API
 */

const db = require('../dataBase/connection');

module.exports = {
    /**
     * Lista auditorias com paginação
     * @param {Object} request - Express request object
     * @param {Object} request.query - Query parameters
     * @param {number} [request.query.page=1] - Número da página
     * @param {number} [request.query.limit=5] - Registros por página
     * @param {Object} response - Express response object
     * @returns {void} JSON com lista de auditorias
     */
    async listarAuditoria(request, response) {
        try {
            const { page = 1, limit = 5 } = request.query;
            const pagina = parseInt(page);
            const limite = parseInt(limit);
            const offset = (pagina - 1) * limite;

            // Conta total de registros ativos
            const [total] = await db.query(`
                SELECT COUNT(*) as total
                FROM AUDITORIA
                WHERE aud_status = 1
            `);

            const totalRegistros = total[0].total;
            const totalPaginas = Math.ceil(totalRegistros / limite);

            // Query principal com JOIN para nome do usuário
            const sql = `
                SELECT
                    a.aud_id,
                    a.usu_id,
                    u.usu_nome,
                    a.aud_acao,
                    CASE
                        WHEN a.aud_acao = 0 THEN 'Inserção'
                        WHEN a.aud_acao = 1 THEN 'Edição'
                        WHEN a.aud_acao = 2 THEN 'Exclusão'
                        ELSE 'Desconhecido'
                    END AS aud_acao_descricao,
                    a.aud_tabela_afetada,
                    a.aud_registro_afetado,
                    a.aud_descricao,
                    a.aud_ip,
                    a.aud_data_acao
                FROM AUDITORIA a
                LEFT JOIN USUARIOS u ON u.usu_id = a.usu_id
                WHERE a.aud_status = 1
                ORDER BY a.aud_data_acao DESC
                LIMIT ?, ?
            `;

            const [auditorias] = await db.query(sql, [offset, limite]);

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Lista de auditorias obtida com sucesso',
                paginacao: {
                    pagina,
                    limite,
                    totalRegistros,
                    totalPaginas
                },
                totalItens: auditorias.length,
                dados: auditorias
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao obter lista de auditorias',
                dados: null
            });
        }
    },

    /**
     * Cadastra novo registro de auditoria
     * @param {Object} request - Express request object
     * @param {Object} request.body - Dados da auditoria
     * @param {number} request.body.usu_id - ID do usuário
     * @param {number} request.body.aud_acao - Tipo de ação (0-2)
     * @param {string} request.body.aud_tabela_afetada - Tabela modificada
     * @param {number} request.body.aud_registro_afetado - ID do registro
     * @param {string} request.body.aud_data_acao - Data/hora da ação
     * @param {string} [request.body.aud_descricao] - Descrição adicional
     * @param {string} [request.body.aud_ip] - IP do cliente
     * @param {Object} response - Express response object
     * @returns {void} JSON com dados do novo registro
     */
    async cadastrarAuditoria(request, response) {
        try {
            const {
                usu_id,
                aud_acao,
                aud_tabela_afetada,
                aud_registro_afetado,
                aud_data_acao,
                aud_descricao,
                aud_ip
            } = request.body;

            // Valida campos obrigatórios
            if (!usu_id || aud_acao === undefined || !aud_tabela_afetada || aud_registro_afetado === undefined || !aud_data_acao) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Campos obrigatórios não informados',
                    dados: null
                });
            }

            // Valida tipos de dados
            if (isNaN(usu_id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'usu_id deve ser numérico',
                    dados: null
                });
            }

            if (isNaN(aud_acao) || aud_acao < 0 || aud_acao > 2) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'aud_acao deve ser 0 (Inserção), 1 (Edição) ou 2 (Exclusão)',
                    dados: null
                });
            }

            if (typeof aud_tabela_afetada !== 'string' || aud_tabela_afetada.trim() === '') {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'aud_tabela_afetada deve ser texto',
                    dados: null
                });
            }

            if (isNaN(aud_registro_afetado)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'aud_registro_afetado deve ser numérico',
                    dados: null
                });
            }

            const data = new Date(aud_data_acao);
            if (isNaN(data.getTime())) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Data inválida',
                    dados: null
                });
            }

            // Valida existência do usuário
            const [usuario] = await db.query(
                'SELECT usu_id FROM USUARIOS WHERE usu_id = ?',
                [usu_id]
            );

            if (usuario.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Usuário não encontrado',
                    dados: null
                });
            }

            // Insere novo registro
            const sql = `
                INSERT INTO AUDITORIA (
                    usu_id,
                    aud_acao,
                    aud_tabela_afetada,
                    aud_registro_afetado,
                    aud_descricao,
                    aud_ip,
                    aud_data_acao
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                usu_id,
                aud_acao,
                aud_tabela_afetada.trim(),
                aud_registro_afetado,
                aud_descricao || null,
                aud_ip || null,
                aud_data_acao
            ];

            const [result] = await db.query(sql, values);

            return response.status(201).json({
                sucesso: true,
                mensagem: 'Auditoria cadastrada com sucesso',
                dados: {
                    aud_id: result.insertId,
                    usu_id,
                    aud_acao,
                    aud_tabela_afetada,
                    aud_registro_afetado,
                    aud_data_acao
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao cadastrar auditoria',
                dados: null
            });
        }
    },

    /**
     * Edita registro de auditoria existente
     * @param {Object} request - Express request object
     * @param {number} request.params.id - ID da auditoria
     * @param {Object} request.body - Campos a atualizar
     * @param {Object} response - Express response object
     * @returns {void} JSON com dados atualizados
     */
    async editarAuditoria(request, response) {
        try {
            const { id } = request.params;
            const {
                usu_id,
                aud_acao,
                aud_tabela_afetada,
                aud_registro_afetado,
                aud_data_acao,
                aud_descricao
            } = request.body;

            // Valida ID
            if (!id || isNaN(id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID inválido',
                    dados: null
                });
            }

            // Valida campos obrigatórios
            if (!usu_id || aud_acao === undefined || !aud_tabela_afetada || aud_registro_afetado === undefined || !aud_data_acao) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'Campos obrigatórios não informados',
                    dados: null
                });
            }

            // Valida tipos de dados
            if (isNaN(usu_id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'usu_id deve ser numérico',
                    dados: null
                });
            }

            if (isNaN(aud_acao) || aud_acao < 0 || aud_acao > 2) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'aud_acao deve ser 0, 1 ou 2',
                    dados: null
                });
            }

            // Verifica existência do registro
            const [auditoria] = await db.query(
                'SELECT aud_id FROM AUDITORIA WHERE aud_id = ? AND aud_status = 1',
                [id]
            );

            if (auditoria.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Auditoria não encontrada',
                    dados: null
                });
            }

            // Verifica existência do usuário
            const [usuario] = await db.query(
                'SELECT usu_id FROM USUARIOS WHERE usu_id = ?',
                [usu_id]
            );

            if (usuario.length === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Usuário não encontrado',
                    dados: null
                });
            }

            // Atualiza registro
            const sql = `
                UPDATE AUDITORIA
                SET
                    usu_id = ?,
                    aud_acao = ?,
                    aud_tabela_afetada = ?,
                    aud_registro_afetado = ?,
                    aud_descricao = ?,
                    aud_data_acao = ?
                WHERE aud_id = ?
            `;

            const values = [
                usu_id,
                aud_acao,
                aud_tabela_afetada.trim(),
                aud_registro_afetado,
                aud_descricao || null,
                aud_data_acao,
                id
            ];

            const [result] = await db.query(sql, values);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: 'Auditoria não encontrada',
                    dados: null
                });
            }

            return response.status(200).json({
                sucesso: true,
                mensagem: 'Auditoria atualizada com sucesso',
                dados: {
                    aud_id: id,
                    usu_id,
                    aud_acao,
                    aud_tabela_afetada,
                    aud_registro_afetado,
                    aud_data_acao
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao atualizar auditoria',
                dados: null
            });
        }
    },

    /**
     * Deleta registro de auditoria (exclusão física)
     * NÃO RECOMENDADO - Use ocultarAuditoria em produção
     * @param {Object} request - Express request object
     * @param {number} request.params.id - ID da auditoria
     * @param {Object} response - Express response object
     * @returns {void} JSON com resultado da operação
     */
    async apagarAuditoria(request, response) {
        try {
            const { id } = request.params;

            if (!id || isNaN(id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID inválido',
                    dados: null
                });
            }

            const sql = 'DELETE FROM AUDITORIA WHERE aud_id = ?';
            const [result] = await db.query(sql, [id]);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Auditoria ${id} não encontrada`,
                    dados: null
                });
            }

            return response.status(200).json({
                sucesso: true,
                mensagem: `Auditoria ${id} excluída com sucesso`
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao excluir auditoria',
                dados: null
            });
        }
    },

    /**
     * Soft delete - Marca registro como inativo (RECOMENDADO)
     * Preserva histórico e rastreabilidade
     * @param {Object} request - Express request object
     * @param {number} request.params.id - ID da auditoria
     * @param {Object} response - Express response object
     * @returns {void} JSON com resultado da operação
     */
    async ocultarAuditoria(request, response) {
        try {
            const { id } = request.params;

            if (!id || isNaN(id)) {
                return response.status(400).json({
                    sucesso: false,
                    mensagem: 'ID inválido',
                    dados: null
                });
            }

            const sql = `
                UPDATE AUDITORIA
                SET aud_status = 0, aud_acao = 2
                WHERE aud_id = ?
            `;

            const [result] = await db.query(sql, [id]);

            if (result.affectedRows === 0) {
                return response.status(404).json({
                    sucesso: false,
                    mensagem: `Auditoria ${id} não encontrada`,
                    dados: null
                });
            }

            return response.status(200).json({
                sucesso: true,
                mensagem: `Auditoria ${id} marcada como inativa`,
                dados: {
                    aud_id: id,
                    aud_status: 0,
                    aud_acao: 2
                }
            });

        } catch (error) {
            return response.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao ocultar auditoria',
                dados: null
            });
        }
    }
};