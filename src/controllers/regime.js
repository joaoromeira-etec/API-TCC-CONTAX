const db = require('../dataBase/connection');

module.exports = {

  async listarRegime(request, response) {
    try {

      const { page = 1, limit = 5 } = request.query;

      const pagina = parseInt(page);
      const limite = parseInt(limit);
      const offset = (pagina - 1) * limite;

      const [total] = await db.query(`
        SELECT COUNT(*) as total
        FROM REGIME
      `);

      const totalRegistros = total[0].total;
      const totalPaginas = Math.ceil(totalRegistros / limite);

      const sql = `
        SELECT
          regi_id,
          regi_nome,
          regi_descricao,
          regi_limite_faturamento_anual,
          regi_tipo_emp_permitida,
          regi_status
        FROM REGIME
        LIMIT ?, ?
      `;

      const [regimes] = await db.query(sql, [offset, limite]);

      return response.status(200).json({
        sucesso: true,
        mensagem: "Lista de regimes obtida com sucesso",
        paginacao: {
          pagina,
          limite,
          total_registros: totalRegistros,
          total_paginas: totalPaginas
        },
        itens: regimes.length,
        dados: regimes
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao obter lista de regimes: ${error.message}`,
        dados: null
      });
    }
  },


  async cadastrarRegime(request, response) {
    try {

      const {
        regi_nome,
        regi_descricao,
        regi_limite_faturamento_anual,
        regi_tipo_emp_permitida,
        regi_status
      } = request.body;

      if (!regi_nome || !regi_limite_faturamento_anual || !regi_tipo_emp_permitida || regi_status === undefined) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "Campos obrigatórios não informados",
          dados: null
        });
      }

      if (typeof regi_nome !== "string") {
        return response.status(400).json({
          sucesso: false,
          mensagem: "regi_nome deve ser texto",
          dados: null
        });
      }

      if (isNaN(regi_limite_faturamento_anual)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "regi_limite_faturamento_anual deve ser numérico",
          dados: null
        });
      }

      if (typeof regi_tipo_emp_permitida !== "string") {
        return response.status(400).json({
          sucesso: false,
          mensagem: "regi_tipo_emp_permitida deve ser texto",
          dados: null
        });
      }

      if (isNaN(regi_status)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "regi_status deve ser numérico",
          dados: null
        });
      }

      const sql = `
        INSERT INTO REGIME
        (regi_nome, regi_descricao, regi_limite_faturamento_anual, regi_tipo_emp_permitida, regi_status)
        VALUES (?, ?, ?, ?, ?)
      `;

      const values = [
        regi_nome,
        regi_descricao,
        regi_limite_faturamento_anual,
        regi_tipo_emp_permitida,
        regi_status
      ];

      const [result] = await db.query(sql, values);

      return response.status(200).json({
        sucesso: true,
        mensagem: "Regime cadastrado com sucesso",
        dados: {
          id: result.insertId,
          ...request.body
        }
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao cadastrar regime: ${error.message}`,
        dados: null
      });
    }
  },


  async editarRegime(request, response) {
    try {

      const {
        regi_nome,
        regi_descricao,
        regi_limite_faturamento_anual,
        regi_tipo_emp_permitida,
        regi_status
      } = request.body;

      const { id } = request.params;

      const [regime] = await db.query(
        "SELECT regi_id FROM REGIME WHERE regi_id = ?",
        [id]
      );

      if (regime.length === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: "Regime não encontrado",
          dados: null
        });
      }

      if (!regi_nome || !regi_limite_faturamento_anual || !regi_tipo_emp_permitida || regi_status === undefined) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "Campos obrigatórios não informados",
          dados: null
        });
      }

      if (typeof regi_nome !== "string") {
        return response.status(400).json({
          sucesso: false,
          mensagem: "regi_nome deve ser texto",
          dados: null
        });
      }

      if (isNaN(regi_limite_faturamento_anual)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "regi_limite_faturamento_anual deve ser numérico",
          dados: null
        });
      }

      if (typeof regi_tipo_emp_permitida !== "string") {
        return response.status(400).json({
          sucesso: false,
          mensagem: "regi_tipo_emp_permitida deve ser texto",
          dados: null
        });
      }

      if (isNaN(regi_status)) {
        return response.status(400).json({
          sucesso: false,
          mensagem: "regi_status deve ser numérico",
          dados: null
        });
      }

      const sql = `
        UPDATE REGIME
        SET
          regi_nome = ?,
          regi_descricao = ?,
          regi_limite_faturamento_anual = ?,
          regi_tipo_emp_permitida = ?,
          regi_status = ?
        WHERE regi_id = ?
      `;

      const values = [
        regi_nome,
        regi_descricao,
        regi_limite_faturamento_anual,
        regi_tipo_emp_permitida,
        regi_status,
        id
      ];

      await db.query(sql, values);

      return response.status(200).json({
        sucesso: true,
        mensagem: "Regime atualizado com sucesso"
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao atualizar regime: ${error.message}`
      });
    }
  },


  async apagarRegime(request, response) {
    try {

      const { id } = request.params;

      const [regime] = await db.query(
        "SELECT regi_id FROM REGIME WHERE regi_id = ?",
        [id]
      );

      if (regime.length === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: "Regime não encontrado",
          dados: null
        });
      }

      const sql = `
        DELETE FROM REGIME
        WHERE regi_id = ?
      `;

      await db.query(sql, [id]);

      return response.status(200).json({
        sucesso: true,
        mensagem: "Regime excluído com sucesso"
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao excluir regime: ${error.message}`
      });
    }
  },


  async ocultarRegime(request, response) {
    try {

      const { id } = request.params;

      const [regime] = await db.query(
        "SELECT regi_id FROM REGIME WHERE regi_id = ?",
        [id]
      );

      if (regime.length === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: "Regime não encontrado",
          dados: null
        });
      }

      const sql = `
        UPDATE REGIME
        SET regi_status = 0
        WHERE regi_id = ?
      `;

      await db.query(sql, [id]);

      return response.status(200).json({
        sucesso: true,
        mensagem: "Regime ocultado com sucesso"
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao ocultar regime: ${error.message}`
      });
    }
  }

};