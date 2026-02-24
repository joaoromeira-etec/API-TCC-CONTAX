const db = require('../dataBase/connection');

module.exports = {  
  async listarAuditoria(request, response) {    
    try {

      const sql = `
    SELECT 
        aud_id,
        usu_id,
        aud_acao,
        aud_tabela_afetada,
        aud_registro_afetado,
        aud_data_acao
    FROM auditoria
    WHERE aud_status = 1;
`;

const [auditoria] = await db.query(sql);

return response.status(200).json({
    sucesso: true,
    mensagem: 'Lista de auditorias obtida com sucesso',
    itens: auditoria.length,
    dados: auditoria
});

    } catch (error) {
      return response.status(500).json({
        SUCESSO: false,
        mensagem: `Erro ao obter lista de auditoria: ${error.message}`,
        dados: null
      });
    }
  },




  async cadastrarAuditoria(request, response) {    
    try {

      // Dados do corpo da requisição
const { usu_id, acao, tabela_afetada, registro_afetado, dt_acao } = request.body;
const aud_status = 1;

// Instrução SQL
const sql = `
    INSERT INTO AUDITORIA 
        (usu_id, aud_acao, aud_tabela_afetada, aud_registro_afetado, aud_data_acao)
    VALUES
        (?, ?, ?, ?, ?);
`;

// Valores
const values = [
    usu_id,
    acao,
    tabela_afetada,
    registro_afetado,
    dt_acao,
    aud_status
];

// Execução da query
const [result] = await db.query(sql, values);

// Identificação do ID inserido
const dados = {
    id: result.insertId,
    usu_id,
    acao,
    tabela_afetada,
    registro_afetado,
    dt_acao
};

return response.status(200).json({
    SUCESSO: true,
    mensagem: 'Registro de auditoria criado com sucesso',
    dados
});

     
    } catch (error) {
      return response.status(500).json({
        SUCESSO: false,
        mensagem: `Erro ao cadastrar auditoria: ${error.message}`,
        dados: null
      });
    }
  },




 
  async editarAuditoria(request, response) {
  try {
    // Parâmetros do corpo da requisição
    const { usu_id, aud_acao, aud_tabela_afetada, aud_registro_afetado, aud_data_acao, aud_status } = request.body;

    // Parâmetro da rota via URL
    const { id } = request.params;

    // Instrução SQL
    const sql = `
      UPDATE AUDITORIA SET
        usu_id = ?, aud_acao = ?, aud_tabela_afetada = ?, 
        aud_registro_afetado = ?, aud_data_acao = ?, aud_status = ?
      WHERE
        aud_id = ?;
    `;

    // Valores em array
    const values = [usu_id, aud_acao, aud_tabela_afetada, aud_registro_afetado, aud_data_acao, aud_status, id];

    // Execução da query
    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return response.status(404).json({
        sucesso: false,
        mensagem: `Auditoria não encontrado para atualização.`,
        dados: null
      });
    }

    const dados = {
      id,
      usu_id,
      aud_acao,
      aud_tabela_afetada,
      aud_registro_afetado,
      aud_data_acao,
      aud_status
    };

    return response.status(200).json({
      sucesso: true,
      mensagem: `Atualização da auditoria ${id} realizada com sucesso.`,
      dados
    });

  } catch (error) {
    return response.status(500).json({
      sucesso: false,
      mensagem: 'Erro na requisição.',
      dados: error.message
    });
  }
},





 
  // Exclusão física (hard delete)
  async apagarAuditoria(request, response) {
    try {
      const { id } = request.params;

      const sql = `DELETE FROM AUDITORIA WHERE aud_id = ?;`;
      const [result] = await db.query(sql, [id]);

      if (result.affectedRows === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: `Registro de auditoria com ID ${id} não encontrado para exclusão.`,
          dados: null
        });
      }

      return response.status(200).json({
        sucesso: true,
        mensagem: `Registro de auditoria com ID ${id} excluído com sucesso.`,
        dados: null
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao excluir auditoria: ${error.message}`,
        dados: null
      });
    }
  },

  // Exclusão lógica (soft delete)
  async ocultarAuditoria(request, response) {
    try {
      const { id } = request.params;

      // Verificar se existe
      const sqlBusca = `
        SELECT aud_id, aud_status 
          FROM AUDITORIA 
        WHERE aud_id = ?;
      `;

      const [rows] = await db.query(sqlBusca, [id]);

      if (rows.length === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: `Registro de auditoria com ID ${id} não encontrado.`,
          dados: null
        });
      }

      if (rows[0].aud_status === 0) {
        return response.status(400).json({
          sucesso: false,
          mensagem: `Registro de auditoria com ID ${id} já está inativo.`,
          dados: null
        });
      }


      // Soft delete
      const sqlOcultar = `
      UPDATE AUDITORIA SET aud_status = 0 
      WHERE aud_id = ?;`;

      const [result] = await db.query(sqlOcultar, [id]);

      if (result.affectedRows === 0) {
        return response.status(404).json({
          sucesso: false,
          mensagem: `Não foi possível inativar o registro de auditoria com ID ${id}.`,
          dados: null
        });
      }

      return response.status(200).json({
        sucesso: true,
        mensagem: `Registro de auditoria com ID ${id} inativado com sucesso.`,
        dados: null
      });

    } catch (error) {
      return response.status(500).json({
        sucesso: false,
        mensagem: `Erro ao inativar auditoria: ${error.message}`,
        dados: null
      });
    }
  }
};
