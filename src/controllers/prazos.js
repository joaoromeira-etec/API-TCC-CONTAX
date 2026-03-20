const db = require('../dataBase/connection');

module.exports = {

  async listarPrazos(request, response) {
    try {

      const { page = 1, limit = 5 } = request.query;

      const pagina = parseInt(page);
      const limite = parseInt(limit);
      const offset = (pagina - 1) * limite;

      const [total] = await db.query(`
        SELECT COUNT(*) as total
        FROM prazos
      `);

      const totalRegistros = total[0].total;
      const totalPaginas = Math.ceil(totalRegistros / limite);

      const sql = `
        SELECT 
            praz_id,
            emp_id,
            praz_descricao,
            praz_data_vencimento,
            praz_status
        FROM prazos
        LIMIT ?, ?
      `;

      const [prazos] = await db.query(sql, [offset, limite]);

      return response.status(200).json({
        sucesso: true,
        mensagem: "Lista de prazos obtida com sucesso",

        paginacao: {
          pagina: pagina,
          limite: limite,
          total_registros: totalRegistros,
          total_paginas: totalPaginas
        },

        itens: prazos.length,
        dados: prazos
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao obter lista de prazos: ${error.message}`,
        dados: null
      });
    }
  },


  async cadastrarPrazos(request, response) {
    try {

      const { emp_id, praz_descricao, praz_data_vencimento, praz_status } = request.body;

      if (!emp_id || !praz_descricao || !praz_data_vencimento || praz_status === undefined) {
        return response.status(400).json({
          SUCESSO: false,
          mensagem: 'Campos obrigatórios não informados',
          dados: null
        });
      }

      if (isNaN(emp_id)) {
        return response.status(400).json({
          SUCESSO: false,
          mensagem: 'emp_id deve ser numérico',
          dados: null
        });
      }

      if (typeof praz_descricao !== "string") {
        return response.status(400).json({
          SUCESSO: false,
          mensagem: 'praz_descricao deve ser texto',
          dados: null
        });
      }

      const data = new Date(praz_data_vencimento);
      if (isNaN(data.getTime())) {
        return response.status(400).json({
          SUCESSO: false,
          mensagem: 'Data de vencimento inválida',
          dados: null
        });
      }

      if (isNaN(praz_status)) {
        return response.status(400).json({
          SUCESSO: false,
          mensagem: 'praz_status deve ser numérico',
          dados: null
        });
      }

      const [empresa] = await db.query(
        "SELECT emp_id FROM EMPRESAS WHERE emp_id = ?",
        [emp_id]
      );

      if (empresa.length === 0) {
        return response.status(404).json({
          SUCESSO: false,
          mensagem: 'Empresa não encontrada',
          dados: null
        });
      }

      const sql = `
        INSERT INTO PRAZOS 
        (emp_id, praz_descricao, praz_data_vencimento, praz_status)
        VALUES (?, ?, ?, ?)
      `;

      const values = [
        emp_id,
        praz_descricao,
        praz_data_vencimento,
        praz_status
      ];

      const [result] = await db.query(sql, values);

      const dados = {
        id: result.insertId,
        emp_id,
        praz_descricao,
        praz_data_vencimento,
        praz_status
      };

      return response.status(200).json({
        SUCESSO: true,
        mensagem: 'Prazo cadastrado com sucesso',
        dados
      });

    } catch (error) {
      return response.status(500).json({
        SUCESSO: false,
        mensagem: `Erro ao cadastrar prazos: ${error.message}`,
        dados: null
      });
    }
  },


  async editarPrazos(request, response) {
    try {

      const { praz_descricao, praz_data_vencimento, praz_status } = request.body;
      const { id } = request.params;

      if (!praz_descricao || !praz_data_vencimento || praz_status === undefined) {
        return response.status(400).json({
          SUCESSO: false,
          mensagem: 'Campos obrigatórios não informados',
          dados: null
        });
      }

      if (typeof praz_descricao !== "string") {
        return response.status(400).json({
          SUCESSO: false,
          mensagem: 'praz_descricao deve ser texto',
          dados: null
        });
      }

      const data = new Date(praz_data_vencimento);
      if (isNaN(data.getTime())) {
        return response.status(400).json({
          SUCESSO: false,
          mensagem: 'Data inválida',
          dados: null
        });
      }

      if (isNaN(praz_status)) {
        return response.status(400).json({
          SUCESSO: false,
          mensagem: 'praz_status deve ser numérico',
          dados: null
        });
      }

      const sql = `
        UPDATE PRAZOS 
        SET praz_descricao = ?, praz_data_vencimento = ?, praz_status = ?
        WHERE praz_id = ?
      `;

      const values = [praz_descricao, praz_data_vencimento, praz_status, id];

      const [result] = await db.query(sql, values);

      if (result.affectedRows === 0) {
        return response.status(404).json({
          SUCESSO: false,
          mensagem: 'Prazo não encontrado',
          dados: null
        });
      }

      return response.status(200).json({
        SUCESSO: true,
        mensagem: 'Prazo atualizado com sucesso',
        dados: { id, praz_descricao, praz_data_vencimento, praz_status }
      });

    } catch (error) {
      return response.status(500).json({
        SUCESSO: false,
        mensagem: `Erro ao atualizar prazo: ${error.message}`,
        dados: null
      });
    }
  },


  async apagarPrazos(request, response) {
    try {

      const { id } = request.params;

      const [prazo] = await db.query(
        "SELECT praz_id FROM PRAZOS WHERE praz_id = ?",
        [id]
      );

      if (prazo.length === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: `Prazo com ID ${id} não encontrado`,
          dados: null
        });
      }

      const sql = `
        UPDATE PRAZOS
        SET praz_status = 2
        WHERE praz_id = ?
      `;

      const [result] = await db.query(sql, [id]);

      if (result.affectedRows === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: `Prazo com ID ${id} não encontrado`,
          dados: null
        });
      }

      return response.status(200).json({
        sucesso: true,
        mensagem: `Prazo ${id} marcado como excluído`,
        dados: { id, status: 2 }
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao excluir prazo: ${error.message}`,
        dados: null
      });
    }
  },


  async ocultarPrazos(request, response) {
    try {

      const { id } = request.params;

      const sqlBusca = `
        SELECT praz_id, praz_status
        FROM PRAZOS
        WHERE praz_id = ?
      `;

      const [rows] = await db.query(sqlBusca, [id]);

      if (rows.length === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: `Prazo com ID ${id} não encontrado`,
          dados: null
        });
      }

      if (rows[0].praz_status === 2) {
        return response.status(400).json({
          sucesso: false,
          mensagem: `Prazo com ID ${id} já está marcado como excluído`,
          dados: null
        });
      }

      const sqlOcultar = `
        UPDATE PRAZOS
        SET praz_status = 2
        WHERE praz_id = ?
      `;

      await db.query(sqlOcultar, [id]);

      return response.status(200).json({
        sucesso: true,
        mensagem: `Prazo ${id} marcado como excluído com sucesso`,
        dados: { id, status: 2 }
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao ocultar prazo: ${error.message}`,
        dados: null
      });
    }
  }

};