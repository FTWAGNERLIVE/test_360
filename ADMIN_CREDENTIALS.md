# Credenciais de Administrador - Farol 360

## Acesso ao Painel Administrativo

**URL:** `/admin` (após fazer login)

## Credenciais Temporárias (Sem Firebase)

- **Email:** `admin@creattive.com`
- **Senha:** `admin123`

✅ **Funciona sem Firebase:** Estas credenciais funcionam como fallback e permitem acesso ao painel admin mesmo sem Firebase configurado. O sistema verifica essas credenciais primeiro antes de tentar autenticação via Firebase.

⚠️ **Nota:** Esta é uma conta temporária para desenvolvimento. Em produção, use contas criadas através do Firebase.

## Funcionalidades do Painel Admin

1. **Visualização de Dados:**
   - Lista todos os usuários que completaram o onboarding
   - Exibe informações como: email, empresa, setor, telefone, objetivos, etc.
   - Ordenação por data (mais recentes primeiro)

2. **Estatísticas:**
   - Total de usuários cadastrados
   - Total de empresas únicas

3. **Busca:**
   - Filtro por email, nome da empresa ou setor

4. **Exportação:**
   - Botão para exportar todos os dados para CSV
   - Arquivo pronto para análise em Excel/Google Sheets

## Segurança

⚠️ **IMPORTANTE:** 
- Estas credenciais são para uso interno apenas
- Em produção, altere a senha padrão
- Considere implementar autenticação mais robusta

## Como Acessar

1. Acesse a aplicação
2. Vá para `/login`
3. Digite as credenciais acima
4. Você será redirecionado automaticamente para `/admin`
