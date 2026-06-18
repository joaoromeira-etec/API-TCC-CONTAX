# Sistema de Controle de Acesso - API CONTAX

## Visão Geral

Este documento descreve o novo sistema de controle de acesso implementado na API CONTAX. O sistema segrega dados e funcionalidades por tipo de empresa (ME ou MEI) e nível de usuário (Visualizador, Gerente ou Administrador).

---

## 1. Tipos de Empresa

| Tipo | Código | Abas Disponíveis |
|------|--------|-----------------|
| **ME** (Microempresa) | 0 | Dashboard, Documentos, Impostos, Faturamento, Caixa, Prazos, Perfil |
| **MEI** (Microempreendedor Individual) | 1 | Dashboard, Imposto (DAS), Notas Emitidas, Controle Mensal |

---

## 2. Níveis de Acesso

| Nível | Código | Descrição | Permissões |
|-------|--------|-----------|-----------|
| **Visualizador** | 0 | Apenas visualiza e baixa documentos | Leitura apenas em documentos e informações da empresa |
| **Gerente** | 1 | Gerencia dados da própria empresa | Leitura + Criação + Edição (sem acesso a impostos) |
| **Administrador** | 2 | Acesso total + uploads | Leitura + Criação + Edição + Upload + Exclusão |

---

## 3. Permissões por Nível de Acesso

### Visualizador (Nível 0)
```
- Documentos: Visualizar, Baixar
- Impostos: Visualizar
- Faturamento: Visualizar
- Caixa (ME): Visualizar
- Prazos (ME): Visualizar
- Perfil (ME): Visualizar
- Imposto DAS (MEI): Visualizar
- Notas Emitidas (MEI): Visualizar
- Controle Mensal (MEI): Visualizar

❌ BLOQUEADO: Upload, Edição, Exclusão
```

### Gerente (Nível 1)
```
- Documentos: Visualizar, Baixar, Criar
- Impostos: Visualizar, Editar
- Faturamento: Visualizar, Editar, Criar
- Caixa (ME): Visualizar, Editar, Criar
- Prazos (ME): Visualizar, Editar, Criar
- Perfil (ME): Visualizar, Editar
- Imposto DAS (MEI): Visualizar, Editar, Criar
- Notas Emitidas (MEI): Visualizar, Editar, Criar
- Controle Mensal (MEI): Visualizar, Editar, Criar
- Empresa: Visualizar, Editar

❌ BLOQUEADO: Upload de documentos, Exclusões
```

### Administrador (Nível 2)
```
✅ ACESSO TOTAL
- Documentos: Visualizar, Baixar, Upload, Editar, Deletar
- Impostos: Visualizar, Editar, Deletar
- Faturamento: Visualizar, Editar, Criar, Deletar
- Caixa (ME): Visualizar, Editar, Criar, Deletar
- Prazos (ME): Visualizar, Editar, Criar, Deletar
- Perfil (ME): Visualizar, Editar
- Imposto DAS (MEI): Visualizar, Editar, Criar, Deletar
- Notas Emitidas (MEI): Visualizar, Editar, Criar, Deletar
- Controle Mensal (MEI): Visualizar, Editar, Criar, Deletar
- Empresa: Visualizar, Editar, Deletar
- Admin: Visualizar resumo, Gerenciar usuários
```

---

## 4. Autenticação

### Como Autenticar-se

Toda rota protegida requer o header `Authorization` com um JSON contendo `usuarioId` e `empresaId`:

```bash
curl -X GET http://localhost:3333/api/dashboard/resumo \
  -H "Authorization: {\"usuarioId\": 1, \"empresaId\": 5}"
```

### Exemplo de Request com cURL

```bash
curl -X GET http://localhost:3333/api/dashboard/abas \
  -H "Content-Type: application/json" \
  -H "Authorization: {\"usuarioId\": 1, \"empresaId\": 5}"
```

### Exemplo de Request com Fetch (JavaScript)

```javascript
const usuarioId = 1;
const empresaId = 5;

const response = await fetch('http://localhost:3333/api/dashboard/resumo', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': JSON.stringify({ usuarioId, empresaId })
  }
});

const data = await response.json();
console.log(data);
```

### Exemplo de Request com Axios (JavaScript)

```javascript
import axios from 'axios';

const usuarioId = 1;
const empresaId = 5;

const client = axios.create({
  baseURL: 'http://localhost:3333/api',
  headers: {
    'Authorization': JSON.stringify({ usuarioId, empresaId })
  }
});

// Agora todos os requests vão incluir o header automaticamente
client.get('/dashboard/resumo')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

---

## 5. Fluxo de Login

O endpoint de login foi melhorado para retornar informações completas:

### Request
```bash
GET /usuarios/login?email=usuario@email.com&senha=senha123
```

### Response (Sucesso)
```json
{
  "sucesso": true,
  "mensagem": "Login efetuado com sucesso",
  "dados": {
    "usuario": {
      "id": 1,
      "nome": "João Silva",
      "status": 1
    },
    "empresas": [
      {
        "emp_id": 5,
        "nome": "Empresa XYZ",
        "tipo": "ME",
        "tipoNumerico": 0,
        "nivel_acesso": 1,
        "nivel_descricao": "Gerente",
        "data_vinculo": "2024-01-15"
      },
      {
        "emp_id": 6,
        "nome": "Empresa ABC",
        "tipo": "MEI",
        "tipoNumerico": 1,
        "nivel_acesso": 2,
        "nivel_descricao": "Administrador",
        "data_vinculo": "2024-02-20"
      }
    ],
    "empresa_padrao": {
      "emp_id": 5,
      "nome": "Empresa XYZ",
      "tipo": "ME",
      "tipoNumerico": 0,
      "nivel_acesso": 1,
      "nivel_descricao": "Gerente",
      "data_vinculo": "2024-01-15"
    }
  }
}
```

---

## 6. Rotas Protegidas (Autenticadas)

Todas as rotas listadas abaixo requerem o header `Authorization`.

### Dashboard

#### Obter Abas Disponíveis
```
GET /api/dashboard/abas
```
Retorna as abas disponíveis baseado no tipo de empresa e nível de acesso.

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Abas disponíveis",
  "dados": {
    "tipo_empresa": "ME",
    "nivel_acesso": 1,
    "abas": ["Dashboard", "Documentos", "Impostos", "Faturamento", "Caixa", "Prazos", "Perfil"]
  }
}
```

#### Obter Resumo do Dashboard
```
GET /api/dashboard/resumo
```
Retorna um resumo com informações principais do dashboard.

**Resposta (ME):**
```json
{
  "sucesso": true,
  "mensagem": "Resumo do dashboard",
  "dados": {
    "empresa": {
      "id": 5,
      "tipo": "ME"
    },
    "documentos": 15,
    "prazos_pendentes": 3,
    "financeiro": {
      "total_faturamento": 50000.00,
      "total_impostos": 5000.00,
      "total_despesas": 10000.00
    }
  }
}
```

### Impostos / DAS

#### Obter Impostos
```
GET /api/dashboard/impostos
```
Para ME: retorna "Impostos"
Para MEI: retorna "DAS"

Visualizador em MEI: **BLOQUEADO** (403)

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Lista de Impostos",
  "dados": {
    "tipo": "Impostos",
    "total": 5,
    "impostos": [
      {
        "fin_id": 1,
        "doc_nome_original": "Imposto_Janeiro_2024.pdf",
        "fin_valor_total": 1000.50,
        "fin_data_emissao": "2024-01-31",
        "fin_status": 1
      }
    ]
  }
}
```

### Faturamento / Notas Emitidas

#### Obter Faturamento
```
GET /api/dashboard/faturamento
```
Para ME: retorna "Faturamento"
Para MEI: retorna "Notas Emitidas"

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Lista de Faturamento/Notas Emitidas",
  "dados": {
    "total_notas": 10,
    "total_faturamento": 75000.00,
    "faturamento": [...]
  }
}
```

### Caixa (apenas ME)

#### Obter Caixa
```
GET /api/dashboard/caixa
```
Retorna resumo de entradas, saídas e impostos.

MEI: **BLOQUEADO** (403)

### Prazos / Controle Mensal

#### Obter Prazos
```
GET /api/dashboard/prazos
```
Para ME: retorna "Prazos"
Para MEI: retorna "Controle Mensal"

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Prazos/Controle Mensal",
  "dados": {
    "total": 5,
    "pendentes": 2,
    "concluidos": 2,
    "vencidos": 1,
    "prazos": [...]
  }
}
```

### Documentos

#### Listar Documentos
```
GET /api/documentos/autenticados
```
Filtra automaticamente documentos da empresa autenticada.
Visualizador, Gerente e ADM: ✅ Permitido

#### Upload de Documento
```
POST /api/documentos/autenticados
Content-Type: multipart/form-data

{
  "tpd_id": 1,
  "arquivo": <arquivo>
}
```

**APENAS ADM (nível 2)**: ✅ Permitido
Visualizador: ❌ BLOQUEADO (403)
Gerente: ❌ BLOQUEADO (403)

**Request Example:**
```bash
curl -X POST http://localhost:3333/api/documentos/autenticados \
  -H "Authorization: {\"usuarioId\": 1, \"empresaId\": 5}" \
  -F "tpd_id=1" \
  -F "arquivo=@documento.pdf"
```

---

## 7. Códigos de Erro HTTP

| Código | Descrição |
|--------|-----------|
| **200** | Sucesso |
| **201** | Criado com sucesso |
| **400** | Requisição inválida |
| **401** | Não autenticado (falta de header ou dados inválidos) |
| **403** | Não autorizado (sem permissão) |
| **404** | Recurso não encontrado |
| **500** | Erro interno do servidor |

### Respostas de Erro

**Sem autenticação:**
```json
{
  "sucesso": false,
  "mensagem": "Token de autenticação não fornecido",
  "dados": null
}
```

**Sem permissão:**
```json
{
  "sucesso": false,
  "mensagem": "Você não tem permissão para acessar este recurso",
  "dados": null
}
```

---

## 8. Variáveis de Ambiente

Certifique-se de ter o arquivo `.env` configurado com:

```env
BD_SERVIDOR=localhost
BD_PORTA=3306
BD_USUARIO=root
BD_SENHA=sua_senha
BD_BANCO=seu_banco
PORT=3333
SERVER=localhost
```

---

## 9. Implementação no Frontend

### Passo 1: Realizar Login
```javascript
async function login(email, senha) {
  const response = await fetch(`/usuarios/login?email=${email}&senha=${senha}`);
  const data = await response.json();
  
  if (data.sucesso) {
    // Armazenar informações
    localStorage.setItem('usuario', JSON.stringify(data.dados.usuario));
    localStorage.setItem('empresa_atual', JSON.stringify(data.dados.empresa_padrao));
    localStorage.setItem('empresas', JSON.stringify(data.dados.empresas));
    return data.dados;
  }
}
```

### Passo 2: Fazer Requisições Autenticadas
```javascript
function getAuthHeader() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const empresa = JSON.parse(localStorage.getItem('empresa_atual'));
  
  return {
    'Authorization': JSON.stringify({
      usuarioId: usuario.id,
      empresaId: empresa.emp_id
    })
  };
}

async function fetchDashboard() {
  const response = await fetch('/api/dashboard/resumo', {
    headers: getAuthHeader()
  });
  const data = await response.json();
  return data;
}
```

### Passo 3: Carregar Abas Dinamicamente
```javascript
async function carregarAbas() {
  const data = await fetchDashboard('/api/dashboard/abas');
  
  if (data.sucesso) {
    const abas = data.dados.abas;
    // Renderizar abas dinamicamente
    renderizarAbas(abas);
  }
}
```

---

## 10. Exemplo Completo de Integração

```javascript
// Cliente API com autenticação
class ClienteAPI {
  constructor(baseURL = 'http://localhost:3333') {
    this.baseURL = baseURL;
    this.usuario = null;
    this.empresa = null;
  }

  // Login
  async login(email, senha) {
    const response = await fetch(
      `${this.baseURL}/usuarios/login?email=${email}&senha=${senha}`
    );
    const data = await response.json();
    
    if (data.sucesso) {
      this.usuario = data.dados.usuario;
      this.empresa = data.dados.empresa_padrao;
      localStorage.setItem('usuario', JSON.stringify(this.usuario));
      localStorage.setItem('empresa', JSON.stringify(this.empresa));
    }
    return data;
  }

  // Get com autenticação
  async get(endpoint) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': JSON.stringify({
        usuarioId: this.usuario.id,
        empresaId: this.empresa.emp_id
      })
    };

    const response = await fetch(`${this.baseURL}/api${endpoint}`, { headers });
    return response.json();
  }

  // Post com autenticação
  async post(endpoint, dados) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': JSON.stringify({
        usuarioId: this.usuario.id,
        empresaId: this.empresa.emp_id
      })
    };

    const response = await fetch(`${this.baseURL}/api${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(dados)
    });
    return response.json();
  }
}

// Uso
const api = new ClienteAPI();

// 1. Login
await api.login('usuario@email.com', 'senha123');

// 2. Obter abas
const abas = await api.get('/dashboard/abas');

// 3. Obter resumo
const resumo = await api.get('/dashboard/resumo');

// 4. Obter impostos
const impostos = await api.get('/dashboard/impostos');
```

---

## 11. Arquivo de Configuração: `src/utils/permissoes.js`

Este arquivo centraliza todas as definições de permissões do sistema. Para modificar permissões, edite este arquivo:

```javascript
// Adicionar nova operação
const OPERACOES_PERMITIDAS = {
  0: { // Visualizador
    nova_operacao: ['visualizar']
  },
  1: { // Gerente
    nova_operacao: ['visualizar', 'editar']
  },
  2: { // ADM
    nova_operacao: ['visualizar', 'editar', 'deletar']
  }
};
```

---

## 12. Próximas Ações

Para integrar ainda mais funcionalidades:

1. ✅ Implementar middleware de autenticação
2. ✅ Criar controller de dashboard
3. ✅ Adicionar controle de upload de documentos
4. ⏳ Adicionar auditoria de ações dos usuários
5. ⏳ Implementar rate limiting por usuário
6. ⏳ Adicionar autenticação via JWT (opcional)

---

## 13. Suporte e Dúvidas

Para dúvidas sobre o sistema, consulte:
- Arquivo de permissões: `src/utils/permissoes.js`
- Middleware de autenticação: `src/middlewares/auth.js`
- Controller de dashboard: `src/controllers/dashboard.js`
- Rotas protegidas: `src/routes/protegidas.js`

---

**Última atualização:** Junho 2024
