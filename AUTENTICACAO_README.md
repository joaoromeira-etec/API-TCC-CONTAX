# 🔐 Sistema de Controle de Acesso - API CONTAX

## ✨ O que foi implementado?

Um sistema robusto de **autenticação e autorização** que segrega dados e funcionalidades por:

### 1. **Tipo de Empresa**
- **ME (Microempresa)** → Acesso completo a todas as abas
- **MEI (Microempreendedor Individual)** → Acesso limitado a funções específicas

### 2. **Nível de Usuário**
- **👁️ Visualizador (0)** → Apenas visualiza e baixa documentos
- **👔 Gerente (1)** → Vê e insere dados da empresa
- **👨‍💼 Administrador (2)** → Acesso total + faz uploads de documentos

---

## 🚀 Como Usar?

### Passo 1: Login
```bash
GET /usuarios/login?email=usuario@email.com&senha=senha123
```

**Resposta inclui:**
```json
{
  "usuario": { "id": 1, "nome": "João" },
  "empresas": [...],
  "empresa_padrao": { "emp_id": 5, "tipo": "ME", "nivel_acesso": 1 }
}
```

### Passo 2: Usar token de autenticação
Todas as rotas protegidas requerem o header `Authorization`:

```bash
curl -X GET http://localhost:3333/api/dashboard/abas \
  -H 'Authorization: {"usuarioId": 1, "empresaId": 5}'
```

### Passo 3: Acessar as abas corretas

**Para ME:**
```
Dashboard → Documentos → Impostos → Faturamento → Caixa → Prazos → Perfil
```

**Para MEI:**
```
Dashboard → Imposto (DAS) → Notas Emitidas → Controle Mensal
```

---

## 📋 Abas e Funcionalidades

| Aba | ME | MEI | Visualizador | Gerente | ADM |
|-----|----|----|-------------|---------|-----|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Documentos | ✅ | ❌ | Ver | Ver | Upload |
| Impostos | ✅ | ❌ | Ver | Edit | Edit |
| DAS | ❌ | ✅ | ❌ | ✅ | ✅ |
| Faturamento | ✅ | ❌ | Ver | Edit | Edit |
| Notas Emitidas | ❌ | ✅ | Ver | Edit | Edit |
| Caixa | ✅ | ❌ | Ver | Edit | Edit |
| Prazos | ✅ | ❌ | Ver | Edit | Edit |
| Controle Mensal | ❌ | ✅ | Ver | Edit | Edit |
| Perfil | ✅ | ❌ | Ver | Edit | Edit |

---

## 🔑 Rotas Protegidas

### Dashboard
```
GET /api/dashboard/abas              # Abas disponíveis
GET /api/dashboard/resumo            # Resumo geral
GET /api/dashboard/impostos          # Impostos/DAS
GET /api/dashboard/faturamento       # Faturamento/Notas
GET /api/dashboard/caixa             # Caixa (ME)
GET /api/dashboard/prazos            # Prazos/Controle
```

### Documentos
```
GET /api/documentos/autenticados         # Listar
POST /api/documentos/autenticados        # Upload (ADM only)
```

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos:
- ✅ `src/middlewares/auth.js` - Middleware de autenticação
- ✅ `src/utils/permissoes.js` - Configuração de permissões
- ✅ `src/controllers/dashboard.js` - Controller do dashboard
- ✅ `src/routes/protegidas.js` - Rotas protegidas
- ✅ `AUTENTICACAO_E_PERMISSOES.md` - Documentação completa
- ✅ `EXEMPLOS_DE_USO.js` - Exemplos práticos
- ✅ `TESTES_CURL.sh` - Script de testes

### Arquivos Modificados:
- ✅ `src/controllers/usuarios.js` - Login atualizado
- ✅ `src/controllers/documentos.js` - Validações de permissão
- ✅ `src/routes/routes.js` - Novas rotas integradas

---

## 💡 Exemplo de Uso Completo

```javascript
// 1. Fazer login
const response = await fetch('/usuarios/login?email=user@email.com&senha=123');
const { usuario, empresa_padrao } = await response.json();

// 2. Guardar dados de autenticação
const auth = {
  usuarioId: usuario.id,
  empresaId: empresa_padrao.emp_id
};

// 3. Usar em requisições protegidas
const dash = await fetch('/api/dashboard/resumo', {
  headers: { 'Authorization': JSON.stringify(auth) }
});

// 4. O sistema filtra automaticamente por:
// - Tipo de empresa (ME/MEI)
// - Nível de acesso (Visualizador/Gerente/ADM)
// - Permissões específicas
```

---

## 🛡️ Tratamento de Erros

| Erro | Causa | Solução |
|------|-------|--------|
| 401 | Sem autenticação | Adicione o header Authorization |
| 403 | Sem permissão | Verifique o nível de acesso |
| 404 | Recurso não encontrado | Verifique os IDs |
| 500 | Erro do servidor | Verifique os logs |

---

## 📚 Documentação

Para mais detalhes, veja:
- 📖 **AUTENTICACAO_E_PERMISSOES.md** - Documentação completa
- 💻 **EXEMPLOS_DE_USO.js** - Exemplos de código
- 🧪 **TESTES_CURL.sh** - Testes com curl

---

## ⚙️ Configuração

Certifique-se de ter no `.env`:

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

## 🎯 Próximas Melhorias

- ⏳ JWT tokens para autenticação mais segura
- ⏳ Auditoria de ações de usuários
- ⏳ Rate limiting por usuário
- ⏳ Refresh tokens
- ⏳ 2FA (Autenticação de dois fatores)

---

## 📞 Suporte

Em caso de dúvidas:
1. Consulte a documentação em `AUTENTICACAO_E_PERMISSOES.md`
2. Veja exemplos em `EXEMPLOS_DE_USO.js`
3. Teste com `TESTES_CURL.sh`

---

**Última atualização:** Junho 2024
**Versão:** 1.0.0
