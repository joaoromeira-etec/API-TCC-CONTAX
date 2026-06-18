#!/bin/bash

# ============================================================================
# TESTES DA API COM CURL
# ============================================================================
# Este arquivo contém exemplos de comandos curl para testar todas as funcionalidades
# da API CONTAX com o novo sistema de autenticação e permissões.

# CONFIGURAÇÃO
BASE_URL="http://localhost:3333"
USUARIO_EMAIL="usuario@email.com"
USUARIO_SENHA="senha123"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== TESTES API CONTAX ===${NC}\n"

# ============================================================================
# TESTE 1: LOGIN
# ============================================================================
echo -e "${YELLOW}[TESTE 1] Login${NC}"

LOGIN_RESPONSE=$(curl -s -X GET "${BASE_URL}/usuarios/login?email=${USUARIO_EMAIL}&senha=${USUARIO_SENHA}")

echo "Resposta:"
echo "$LOGIN_RESPONSE" | jq '.'

# Extrair IDs para usar nos próximos testes
USUARIO_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.dados.usuario.id')
EMPRESA_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.dados.empresa_padrao.emp_id')
TIPO_EMPRESA=$(echo "$LOGIN_RESPONSE" | jq -r '.dados.empresa_padrao.tipoNumerico')
NIVEL_ACESSO=$(echo "$LOGIN_RESPONSE" | jq -r '.dados.empresa_padrao.nivel_acesso')

echo -e "\n${GREEN}IDs extraídos:${NC}"
echo "  USUARIO_ID: $USUARIO_ID"
echo "  EMPRESA_ID: $EMPRESA_ID"
echo "  TIPO_EMPRESA: $TIPO_EMPRESA (0=ME, 1=MEI)"
echo "  NIVEL_ACESSO: $NIVEL_ACESSO (0=Visualizador, 1=Gerente, 2=ADM)"

# ============================================================================
# FUNÇÃO AUXILIAR PARA FAZER REQUISIÇÕES AUTENTICADAS
# ============================================================================
fazer_requisicao_autenticada() {
  local metodo=$1
  local endpoint=$2
  local dados=$3

  local auth_header="{\"usuarioId\": $USUARIO_ID, \"empresaId\": $EMPRESA_ID}"

  if [ "$metodo" == "GET" ]; then
    curl -s -X GET "${BASE_URL}/api${endpoint}" \
      -H "Authorization: $auth_header"
  elif [ "$metodo" == "POST" ]; then
    curl -s -X POST "${BASE_URL}/api${endpoint}" \
      -H "Authorization: $auth_header" \
      -H "Content-Type: application/json" \
      -d "$dados"
  fi
}

# ============================================================================
# TESTE 2: OBTER ABAS DISPONÍVEIS
# ============================================================================
echo -e "\n${YELLOW}[TESTE 2] Obter Abas Disponíveis${NC}\n"

ABAS_RESPONSE=$(fazer_requisicao_autenticada "GET" "/dashboard/abas")
echo "Resposta:"
echo "$ABAS_RESPONSE" | jq '.'

# ============================================================================
# TESTE 3: OBTER RESUMO DO DASHBOARD
# ============================================================================
echo -e "\n${YELLOW}[TESTE 3] Obter Resumo do Dashboard${NC}\n"

RESUMO_RESPONSE=$(fazer_requisicao_autenticada "GET" "/dashboard/resumo")
echo "Resposta:"
echo "$RESUMO_RESPONSE" | jq '.'

# ============================================================================
# TESTE 4: OBTER IMPOSTOS/DAS
# ============================================================================
echo -e "\n${YELLOW}[TESTE 4] Obter Impostos/DAS${NC}\n"

IMPOSTOS_RESPONSE=$(fazer_requisicao_autenticada "GET" "/dashboard/impostos")
echo "Resposta:"
echo "$IMPOSTOS_RESPONSE" | jq '.'

# ============================================================================
# TESTE 5: OBTER FATURAMENTO/NOTAS EMITIDAS
# ============================================================================
echo -e "\n${YELLOW}[TESTE 5] Obter Faturamento/Notas Emitidas${NC}\n"

FATURAMENTO_RESPONSE=$(fazer_requisicao_autenticada "GET" "/dashboard/faturamento")
echo "Resposta:"
echo "$FATURAMENTO_RESPONSE" | jq '.'

# ============================================================================
# TESTE 6: OBTER CAIXA (se ME)
# ============================================================================
if [ "$TIPO_EMPRESA" == "0" ]; then
  echo -e "\n${YELLOW}[TESTE 6] Obter Caixa (ME)${NC}\n"

  CAIXA_RESPONSE=$(fazer_requisicao_autenticada "GET" "/dashboard/caixa")
  echo "Resposta:"
  echo "$CAIXA_RESPONSE" | jq '.'
else
  echo -e "\n${YELLOW}[TESTE 6] Pular Caixa (MEI não tem acesso)${NC}\n"
fi

# ============================================================================
# TESTE 7: OBTER PRAZOS/CONTROLE MENSAL
# ============================================================================
echo -e "\n${YELLOW}[TESTE 7] Obter Prazos/Controle Mensal${NC}\n"

PRAZOS_RESPONSE=$(fazer_requisicao_autenticada "GET" "/dashboard/prazos")
echo "Resposta:"
echo "$PRAZOS_RESPONSE" | jq '.'

# ============================================================================
# TESTE 8: LISTAR DOCUMENTOS
# ============================================================================
echo -e "\n${YELLOW}[TESTE 8] Listar Documentos${NC}\n"

DOCUMENTOS_RESPONSE=$(fazer_requisicao_autenticada "GET" "/documentos/autenticados")
echo "Resposta:"
echo "$DOCUMENTOS_RESPONSE" | jq '.'

# ============================================================================
# TESTE 9: TENTAR FAZER UPLOAD (se ADM)
# ============================================================================
if [ "$NIVEL_ACESSO" == "2" ]; then
  echo -e "\n${YELLOW}[TESTE 9] Fazer Upload de Documento (ADM)${NC}\n"

  # Criar arquivo de teste
  echo "Arquivo de teste para upload" > /tmp/teste_documento.txt

  curl -s -X POST "${BASE_URL}/api/documentos/autenticados" \
    -H "Authorization: {\"usuarioId\": $USUARIO_ID, \"empresaId\": $EMPRESA_ID}" \
    -F "tpd_id=1" \
    -F "arquivo=@/tmp/teste_documento.txt" | jq '.'

  # Limpar arquivo de teste
  rm /tmp/teste_documento.txt
else
  echo -e "\n${YELLOW}[TESTE 9] Pular Upload (usuário não é ADM)${NC}\n"
  echo "Nível de acesso: $NIVEL_ACESSO (esperado: 2 para ADM)"
fi

# ============================================================================
# RESUMO DOS TESTES
# ============================================================================
echo -e "\n${GREEN}=== RESUMO DOS TESTES ===${NC}"
echo "Usuário: $USUARIO_ID"
echo "Empresa: $EMPRESA_ID"
echo "Tipo: $([ "$TIPO_EMPRESA" == "0" ] && echo "ME" || echo "MEI")"
echo "Nível: $(
  case $NIVEL_ACESSO in
    0) echo "Visualizador" ;;
    1) echo "Gerente" ;;
    2) echo "Administrador" ;;
  esac
)"

echo -e "\n${GREEN}Testes completados!${NC}\n"

# ============================================================================
# EXEMPLOS ADICIONAIS COM CURL DIRETO
# ============================================================================

cat << 'EOF'

============================================================================
EXEMPLOS ADICIONAIS COM CURL DIRETO
============================================================================

1. LOGIN:
   curl -X GET "http://localhost:3333/usuarios/login?email=usuario@email.com&senha=senha123"

2. OBTER ABAS (com autenticação):
   curl -X GET "http://localhost:3333/api/dashboard/abas" \
     -H 'Authorization: {"usuarioId": 1, "empresaId": 5}'

3. FAZER UPLOAD (apenas ADM):
   curl -X POST "http://localhost:3333/api/documentos/autenticados" \
     -H 'Authorization: {"usuarioId": 1, "empresaId": 5}' \
     -F "tpd_id=1" \
     -F "arquivo=@/caminho/para/arquivo.pdf"

4. TESTAR SEM AUTENTICAÇÃO (deve retornar erro):
   curl -X GET "http://localhost:3333/api/dashboard/resumo"

5. TESTAR SEM PERMISSÃO (ex: Visualizador tentando fazer upload):
   curl -X POST "http://localhost:3333/api/documentos/autenticados" \
     -H 'Authorization: {"usuarioId": 2, "empresaId": 5}' \
     -F "tpd_id=1" \
     -F "arquivo=@arquivo.pdf"

============================================================================
EOF
