const db = require('../dataBase/connection');

module.exports = {

  async listarAuditoria(request, response) {
    try {
      const { page = 1, limit = 5 } = request.query;

      const pagina = parseInt(page);
      const limite = parseInt(limit);
      const offset = (pagina - 1) * limite;

      const [total] = await db.query(`
        SELECT COUNT(*) as total
        FROM AUDITORIA
        WHERE aud_status = 1
      `);

      const totalRegistros = total[0].total;
      const totalPaginas = Math.ceil(totalRegistros / limite);

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
          a.aud_data_acao
        FROM AUDITORIA a
        LEFT JOIN USUARIOS u
          ON u.usu_id = a.usu_id
        WHERE a.aud_status = 1
        ORDER BY a.aud_id DESC
        LIMIT ?, ?
      `;

      const [auditorias] = await db.query(sql, [offset, limite]);

      return response.status(200).json({
        sucesso: true,
        mensagem: "Lista de auditorias obtida com sucesso",
        paginacao: {
          pagina,
          limite,
          total_registros: totalRegistros,
          total_paginas: totalPaginas
        },
        itens: auditorias.length,
        dados: auditorias
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao obter lista de auditorias: ${error.message}`,
        dados: null
      });
    }
  },


  async cadastrarAuditoria(request, response) {
    try {
      const {
        usu_id,
        aud_acao,
        aud_tabela_afetada,
        aud_registro_afetado,
        aud_data_acao
      } = request.body;

      if (
        !usu_id ||
        aud_acao === undefined ||
        !aud_tabela_afetada ||
        aud_registro_afetado === undefined ||
        !aud_data_acao
      ) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "Campos obrigatórios não informados",
          dados: null
        });
      }

      if (isNaN(usu_id)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "usu_id deve ser numérico",
          dados: null
        });
      }

      if (isNaN(aud_acao)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "aud_acao deve ser numérico",
          dados: null
        });
      }

      if (aud_acao < 0 || aud_acao > 2) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "aud_acao deve ser 0, 1 ou 2",
          dados: null
        });
      }

      if (typeof aud_tabela_afetada !== "string" || aud_tabela_afetada.trim() === "") {
        return response.status(400).json({
          sucesso: false,
          mensagem: "aud_tabela_afetada deve ser texto",
          dados: null
        });
      }

      if (isNaN(aud_registro_afetado)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "aud_registro_afetado deve ser numérico",
          dados: null
        });
      }

      const data = new Date(aud_data_acao);
      if (isNaN(data.getTime())) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "Data inválida",
          dados: null
        });
      }

      const [usuario] = await db.query(
        "SELECT usu_id FROM USUARIOS WHERE usu_id = ?",
        [usu_id]
      );

      if (usuario.length === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: "Usuário não encontrado",
          dados: null
        });
      }

      const sql = `
        INSERT INTO AUDITORIA
        (usu_id, aud_acao, aud_tabela_afetada, aud_registro_afetado, aud_data_acao)
        VALUES (?, ?, ?, ?, ?)
      `;

      const values = [
        usu_id,
        aud_acao,
        aud_tabela_afetada.trim(),
        aud_registro_afetado,
        aud_data_acao
      ];

      const [result] = await db.query(sql, values);

      return response.status(200).json({
        sucesso: true,
        mensagem: "Auditoria cadastrada com sucesso",
        dados: {
          id: result.insertId,
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
        mensagem: `Erro ao cadastrar auditoria: ${error.message}`,
        dados: null
      });
    }
  },


  async editarAuditoria(request, response) {
    try {
      const {
        usu_id,
        aud_acao,
        aud_tabela_afetada,
        aud_registro_afetado,
        aud_data_acao
      } = request.body;

      const { id } = request.params;

      if (!id || isNaN(id)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "ID inválido",
          dados: null
        });
      }

      if (
        !usu_id ||
        aud_acao === undefined ||
        !aud_tabela_afetada ||
        aud_registro_afetado === undefined ||
        !aud_data_acao
      ) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "Campos obrigatórios não informados",
          dados: null
        });
      }

      if (isNaN(usu_id)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "usu_id deve ser numérico",
          dados: null
        });
      }

      if (isNaN(aud_acao)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "aud_acao deve ser numérico",
          dados: null
        });
      }

      if (aud_acao < 0 || aud_acao > 2) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "aud_acao deve ser 0, 1 ou 2",
          dados: null
        });
      }

      if (typeof aud_tabela_afetada !== "string" || aud_tabela_afetada.trim() === "") {
        return response.status(400).json({
          sucesso: false,
          mensagem: "aud_tabela_afetada deve ser texto",
          dados: null
        });
      }

      if (isNaN(aud_registro_afetado)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "aud_registro_afetado deve ser numérico",
          dados: null
        });
      }

      const data = new Date(aud_data_acao);
      if (isNaN(data.getTime())) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "Data inválida",
          dados: null
        });
      }

      const [auditoria] = await db.query(
        "SELECT aud_id FROM AUDITORIA WHERE aud_id = ? AND aud_status = 1",
        [id]
      );

      if (auditoria.length === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: "Auditoria não encontrada",
          dados: null
        });
      }

      const [usuario] = await db.query(
        "SELECT usu_id FROM USUARIOS WHERE usu_id = ?",
        [usu_id]
      );

      if (usuario.length === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: "Usuário não encontrado",
          dados: null
        });
      }

      const sql = `
        UPDATE AUDITORIA
        SET
          usu_id = ?,
          aud_acao = ?,
          aud_tabela_afetada = ?,
          aud_registro_afetado = ?,
          aud_data_acao = ?
        WHERE aud_id = ?
      `;

      const values = [
        usu_id,
        aud_acao,
        aud_tabela_afetada.trim(),
        aud_registro_afetado,
        aud_data_acao,
        id
      ];

      const [result] = await db.query(sql, values);

      if (result.affectedRows === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: "Auditoria não encontrada",
          dados: null
        });
      }

      return response.status(200).json({
        sucesso: true,
        mensagem: "Auditoria atualizada com sucesso",
        dados: {
          id,
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
        mensagem: `Erro ao atualizar auditoria: ${error.message}`,
        dados: null
      });
    }
  },


  async apagarAuditoria(request, response) {
    try {
      const { id } = request.params;

      if (!id || isNaN(id)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "ID inválido",
          dados: null
        });
      }

      const sql = `
        DELETE FROM AUDITORIA
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
        mensagem: `Auditoria ${id} excluída com sucesso`
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao excluir auditoria: ${error.message}`,
        dados: null
      });
    }
  },


  async ocultarAuditoria(request, response) {
    try {
      const { id } = request.params;

      if (!id || isNaN(id)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "ID inválido",
          dados: null
        });
      }

      const sql = `
        UPDATE AUDITORIA
        SET aud_status = 0,
            aud_acao = 2
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
        mensagem: `Auditoria ${id} marcada como exclusão`,
        dados: {
          id,
          aud_acao: 2
        }
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao ocultar auditoria: ${error.message}`,
        dados: null
      });
    }
  }

};