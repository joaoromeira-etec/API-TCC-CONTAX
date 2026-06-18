const db = require('../dataBase/connection');

module.exports = {

  async listarPrazos(request, response) {
    try {

      const { page = 1, limit = 5, emp_id } = request.query;

      const pagina = parseInt(page);
      const limite = parseInt(limit);
      const offset = (pagina - 1) * limite;

      const [total] = await db.query(`
        SELECT COUNT(*) as total
        FROM PRAZOS
        WHERE (? IS NULL OR emp_id = ?)
        AND praz_status <> 2
      `, [emp_id || null, emp_id || null]);

      const totalRegistros = total[0].total;
      const totalPaginas = Math.ceil(totalRegistros / limite);

      const sql = `
        SELECT 
          p.praz_id,
          p.emp_id,
          e.emp_nome_fantasia,
          p.praz_descricao,
          p.praz_data_vencimento,
          p.praz_status,
          DATEDIFF(p.praz_data_vencimento, CURDATE()) AS dias_restantes,
          CASE
            WHEN p.praz_status = 1 THEN 'Concluído'
            WHEN p.praz_status = 0 AND p.praz_data_vencimento < CURDATE() THEN 'Vencido'
            WHEN p.praz_status = 0 AND p.praz_data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Vence esta semana'
            WHEN p.praz_status = 0 THEN 'Pendente'
            ELSE 'Oculto'
          END AS status_descricao
      FROM PRAZOS p
      LEFT JOIN EMPRESAS e
        ON e.emp_id = p.emp_id
      WHERE (? IS NULL OR p.emp_id = ?)
      AND p.praz_status <> 2
      ORDER BY p.praz_data_vencimento ASC
      LIMIT ?, ?
    `;

      const [prazos] = await db.query(sql, [emp_id || null, emp_id || null, offset, limite]);

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

  async resumoPrazos(request, response) {
  try {
    const { emp_id } = request.query;

    const sql = `
      SELECT
        COUNT(*) AS total_prazos,
        SUM(CASE
          WHEN praz_status = 0
          AND praz_data_vencimento >= CURDATE()
          THEN 1 ELSE 0 END
        ) AS pendencias,
        SUM(CASE
          WHEN praz_status = 0
          AND praz_data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
          THEN 1 ELSE 0 END
        ) AS vencendo_semana,
        SUM(CASE
          WHEN praz_status = 0
          AND praz_data_vencimento < CURDATE()
          THEN 1 ELSE 0 END
        ) AS vencidos,
        SUM(CASE
          WHEN praz_status = 1
          THEN 1 ELSE 0 END
        ) AS concluidos
      FROM PRAZOS
      WHERE praz_status <> 2
      AND (? IS NULL OR emp_id = ?)
    `;

    const [rows] = await db.query(sql, [emp_id || null, emp_id || null]);

    return response.status(200).json({
      sucesso: true,
      mensagem: "Resumo de prazos obtido com sucesso",
      dados: rows[0]
    });

  } catch (error) {
    return response.status(500).json({
      sucesso: false,
      mensagem: `Erro ao obter resumo de prazos: ${error.message}`,
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