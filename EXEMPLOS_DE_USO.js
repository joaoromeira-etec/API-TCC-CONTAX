/**
 * EXEMPLOS PRÁTICOS DE USO DO SISTEMA DE AUTENTICAÇÃO E PERMISSÕES
 * 
 * Este arquivo contém exemplos de como usar a API com o novo sistema
 * de controle de acesso por tipo de empresa e nível de usuário.
 */

// ============================================================================
// EXEMPLO 1: LOGIN E OBTENÇÃO DE INFORMAÇÕES DE ACESSO
// ============================================================================

async function exemplo1_Login() {
  try {
    // Request de login
    const response = await fetch('http://localhost:3333/usuarios/login', {
      method: 'GET',
      // URL params: ?email=usuario@email.com&senha=senha123
    });

    const resultado = await response.json();

    if (resultado.sucesso) {
      const { usuario, empresas, empresa_padrao } = resultado.dados;

      console.log('Usuário logado:', usuario.nome);
      console.log('Empresas vinculadas:', empresas.length);
      console.log('Empresa padrão:', empresa_padrao.nome);
      console.log('Tipo:', empresa_padrao.tipo); // ME ou MEI
      console.log('Nível de acesso:', empresa_padrao.nivel_descricao);

      // Guardar para usar nas próximas requisições
      return {
        usuarioId: usuario.id,
        empresaId: empresa_padrao.emp_id,
        tipo: empresa_padrao.tipoNumerico,
        nivel: empresa_padrao.nivel_acesso
      };
    }
  } catch (error) {
    console.error('Erro no login:', error);
  }
}

// ============================================================================
// EXEMPLO 2: OBTER ABAS DISPONÍVEIS PARA O USUÁRIO
// ============================================================================

async function exemplo2_ObterAbas(usuarioId, empresaId) {
  try {
    const response = await fetch('http://localhost:3333/api/dashboard/abas', {
      headers: {
        'Authorization': JSON.stringify({
          usuarioId,
          empresaId
        })
      }
    });

    const resultado = await response.json();

    if (resultado.sucesso) {
      const { tipo_empresa, abas } = resultado.dados;

      console.log(`Tipo de empresa: ${tipo_empresa}`);
      console.log('Abas disponíveis:');
      abas.forEach(aba => console.log(`  - ${aba}`));

      // Exemplo de resposta para ME
      if (tipo_empresa === 'ME') {
        // Abas: Dashboard, Documentos, Impostos, Faturamento, Caixa, Prazos, Perfil
      }

      // Exemplo de resposta para MEI
      if (tipo_empresa === 'MEI') {
        // Abas: Dashboard, Imposto (DAS), Notas Emitidas, Controle Mensal
      }
    }
  } catch (error) {
    console.error('Erro ao obter abas:', error);
  }
}

// ============================================================================
// EXEMPLO 3: OBTER RESUMO DO DASHBOARD
// ============================================================================

async function exemplo3_ResumoDashboard(usuarioId, empresaId) {
  try {
    const response = await fetch('http://localhost:3333/api/dashboard/resumo', {
      headers: {
        'Authorization': JSON.stringify({
          usuarioId,
          empresaId
        })
      }
    });

    const resultado = await response.json();

    if (resultado.sucesso) {
      const { empresa, documentos, prazos_pendentes, financeiro } = resultado.dados;

      console.log(`Empresa: ${empresa.id}`);
      console.log(`Total de documentos: ${documentos}`);
      console.log(`Prazos pendentes: ${prazos_pendentes}`);

      // Para ME, mostra informações de financeiro
      if (financeiro) {
        console.log('Financeiro:');
        console.log(`  - Faturamento: R$ ${financeiro.total_faturamento}`);
        console.log(`  - Impostos: R$ ${financeiro.total_impostos}`);
        console.log(`  - Despesas: R$ ${financeiro.total_despesas}`);
      }
    }
  } catch (error) {
    console.error('Erro ao obter resumo:', error);
  }
}

// ============================================================================
// EXEMPLO 4: OBTER IMPOSTOS/DAS
// ============================================================================

async function exemplo4_ObterImpostos(usuarioId, empresaId) {
  try {
    const response = await fetch('http://localhost:3333/api/dashboard/impostos', {
      headers: {
        'Authorization': JSON.stringify({
          usuarioId,
          empresaId
        })
      }
    });

    const resultado = await response.json();

    if (resultado.sucesso) {
      const { tipo, total, impostos } = resultado.dados;

      console.log(`${tipo}:`);
      console.log(`Total: ${total}`);

      impostos.forEach(imp => {
        console.log(`  - ${imp.doc_nome_original}: R$ ${imp.fin_valor_total}`);
      });
    } else {
      // Pode ser que o usuário não tenha permissão (Visualizador em MEI)
      console.error('Erro:', resultado.mensagem);
    }
  } catch (error) {
    console.error('Erro ao obter impostos:', error);
  }
}

// ============================================================================
// EXEMPLO 5: OBTER FATURAMENTO/NOTAS EMITIDAS
// ============================================================================

async function exemplo5_ObterFaturamento(usuarioId, empresaId) {
  try {
    const response = await fetch('http://localhost:3333/api/dashboard/faturamento', {
      headers: {
        'Authorization': JSON.stringify({
          usuarioId,
          empresaId
        })
      }
    });

    const resultado = await response.json();

    if (resultado.sucesso) {
      const { total_notas, total_faturamento, faturamento } = resultado.dados;

      console.log(`Total de notas: ${total_notas}`);
      console.log(`Total de faturamento: R$ ${total_faturamento}`);

      faturamento.forEach(fat => {
        console.log(`  - ${fat.doc_nome_original}: R$ ${fat.fin_valor_total}`);
      });
    }
  } catch (error) {
    console.error('Erro ao obter faturamento:', error);
  }
}

// ============================================================================
// EXEMPLO 6: OBTER CAIXA (apenas ME)
// ============================================================================

async function exemplo6_ObterCaixa(usuarioId, empresaId) {
  try {
    const response = await fetch('http://localhost:3333/api/dashboard/caixa', {
      headers: {
        'Authorization': JSON.stringify({
          usuarioId,
          empresaId
        })
      }
    });

    const resultado = await response.json();

    if (resultado.sucesso) {
      const { resumo, movimentacoes } = resultado.dados;

      console.log('Resumo de Caixa:');
      console.log(`  - Entradas: R$ ${resumo.entrada}`);
      console.log(`  - Saídas: R$ ${resumo.saida}`);
      console.log(`  - Impostos: R$ ${resumo.impostos}`);
      console.log(`  - Saldo: R$ ${resumo.entrada - resumo.saida - resumo.impostos}`);
    } else {
      // MEI não tem acesso a caixa
      console.error('Erro:', resultado.mensagem);
    }
  } catch (error) {
    console.error('Erro ao obter caixa:', error);
  }
}

// ============================================================================
// EXEMPLO 7: OBTER PRAZOS/CONTROLE MENSAL
// ============================================================================

async function exemplo7_ObterPrazos(usuarioId, empresaId) {
  try {
    const response = await fetch('http://localhost:3333/api/dashboard/prazos', {
      headers: {
        'Authorization': JSON.stringify({
          usuarioId,
          empresaId
        })
      }
    });

    const resultado = await response.json();

    if (resultado.sucesso) {
      const { total, pendentes, concluidos, vencidos, prazos } = resultado.dados;

      console.log('Prazos/Controle Mensal:');
      console.log(`  - Total: ${total}`);
      console.log(`  - Pendentes: ${pendentes}`);
      console.log(`  - Concluídos: ${concluidos}`);
      console.log(`  - Vencidos: ${vencidos}`);

      prazos.forEach(prazo => {
        console.log(`  - ${prazo.praz_descricao}: ${prazo.status_descricao}`);
      });
    }
  } catch (error) {
    console.error('Erro ao obter prazos:', error);
  }
}

// ============================================================================
// EXEMPLO 8: LISTAR DOCUMENTOS
// ============================================================================

async function exemplo8_ListarDocumentos(usuarioId, empresaId) {
  try {
    const response = await fetch('http://localhost:3333/api/documentos/autenticados', {
      headers: {
        'Authorization': JSON.stringify({
          usuarioId,
          empresaId
        })
      }
    });

    const resultado = await response.json();

    if (resultado.sucesso) {
      const { nItens, dados } = resultado;

      console.log(`Total de documentos: ${nItens}`);

      dados.forEach(doc => {
        console.log(`
          - ID: ${doc.doc_id}
          - Nome: ${doc.doc_nome_original}
          - Tipo: ${doc.tpd_descricao}
          - Data: ${doc.doc_data_upload}
          - URL: ${doc.doc_url}
        `);
      });
    }
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
  }
}

// ============================================================================
// EXEMPLO 9: FAZER UPLOAD DE DOCUMENTO (APENAS ADM)
// ============================================================================

async function exemplo9_UploadDocumento(usuarioId, empresaId, arquivo, tipoDocumentoId) {
  try {
    const formData = new FormData();
    formData.append('tpd_id', tipoDocumentoId);
    formData.append('arquivo', arquivo);

    const response = await fetch('http://localhost:3333/api/documentos/autenticados', {
      method: 'POST',
      headers: {
        'Authorization': JSON.stringify({
          usuarioId,
          empresaId
        })
      },
      body: formData
    });

    const resultado = await response.json();

    if (resultado.sucesso) {
      console.log('Documento enviado com sucesso!');
      console.log('ID do documento:', resultado.dados.doc_id);
    } else {
      console.error('Erro:', resultado.mensagem);
      // Se for 403, significa que o usuário não é ADM
    }
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
  }
}

// ============================================================================
// EXEMPLO 10: CLASSE WRAPPER PARA FACILITAR INTEGRAÇÃO
// ============================================================================

class ClienteContax {
  constructor(baseURL = 'http://localhost:3333') {
    this.baseURL = baseURL;
    this.usuarioId = null;
    this.empresaId = null;
    this.tipoEmpresa = null;
    this.nivelAcesso = null;
  }

  // Login
  async login(email, senha) {
    try {
      const response = await fetch(
        `${this.baseURL}/usuarios/login?email=${email}&senha=${senha}`
      );
      const data = await response.json();

      if (data.sucesso) {
        const { usuario, empresa_padrao } = data.dados;
        this.usuarioId = usuario.id;
        this.empresaId = empresa_padrao.emp_id;
        this.tipoEmpresa = empresa_padrao.tipoNumerico;
        this.nivelAcesso = empresa_padrao.nivel_acesso;
        return data;
      }
      throw new Error(data.mensagem);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  // Método auxiliar para fazer requisições autenticadas
  async _request(endpoint, opcoes = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': JSON.stringify({
        usuarioId: this.usuarioId,
        empresaId: this.empresaId
      }),
      ...opcoes.headers
    };

    const response = await fetch(`${this.baseURL}/api${endpoint}`, {
      ...opcoes,
      headers
    });

    return response.json();
  }

  // Dashboard
  async obterAbas() {
    return this._request('/dashboard/abas');
  }

  async obterResumoDashboard() {
    return this._request('/dashboard/resumo');
  }

  async obterImpostos() {
    return this._request('/dashboard/impostos');
  }

  async obterFaturamento() {
    return this._request('/dashboard/faturamento');
  }

  async obterCaixa() {
    return this._request('/dashboard/caixa');
  }

  async obterPrazos() {
    return this._request('/dashboard/prazos');
  }

  // Documentos
  async listarDocumentos() {
    return this._request('/documentos/autenticados');
  }

  async fazerUpload(arquivo, tipoDocumentoId) {
    const formData = new FormData();
    formData.append('tpd_id', tipoDocumentoId);
    formData.append('arquivo', arquivo);

    return this._request('/documentos/autenticados', {
      method: 'POST',
      headers: {}, // FormData define o Content-Type
      body: formData
    });
  }

  // Verificar se tem permissão
  temPermissao(operacao) {
    const permissoes = {
      'upload': this.nivelAcesso === 2, // Apenas ADM
      'editar': [1, 2].includes(this.nivelAcesso), // Gerente ou ADM
      'ver_impostos': this.nivelAcesso !== 0 || this.tipoEmpresa !== 1, // Não se for visualizador em MEI
      'ver_caixa': this.tipoEmpresa === 0 // Apenas ME
    };

    return permissoes[operacao] || false;
  }
}

// ============================================================================
// USO DO WRAPPER
// ============================================================================

async function exemplo10_UsarWrapper() {
  const cliente = new ClienteContax();

  try {
    // 1. Login
    await cliente.login('usuario@email.com', 'senha123');

    // 2. Verificar permissões
    if (cliente.temPermissao('upload')) {
      console.log('Usuário pode fazer upload');
    }

    // 3. Obter dados
    const abas = await cliente.obterAbas();
    const resumo = await cliente.obterResumoDashboard();
    const impostos = await cliente.obterImpostos();
    const faturamento = await cliente.obterFaturamento();

    console.log('Abas:', abas.dados.abas);
    console.log('Resumo:', resumo.dados);

  } catch (error) {
    console.error('Erro:', error);
  }
}

// ============================================================================
// EXPORTAR PARA USO
// ============================================================================

export {
  exemplo1_Login,
  exemplo2_ObterAbas,
  exemplo3_ResumoDashboard,
  exemplo4_ObterImpostos,
  exemplo5_ObterFaturamento,
  exemplo6_ObterCaixa,
  exemplo7_ObterPrazos,
  exemplo8_ListarDocumentos,
  exemplo9_UploadDocumento,
  exemplo10_UsarWrapper,
  ClienteContax
};
