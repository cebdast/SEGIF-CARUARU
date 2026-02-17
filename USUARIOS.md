# Gerenciamento de Usuários - SIGEF Caruaru

## Sistema de Autenticação Local

O SIGEF Caruaru utiliza autenticação local (sem backend), com usuários e senhas armazenados no código do sistema.

## Credenciais Padrão

### Usuário Administrador
- **Usuário:** `admin`
- **Senha:** `admin123`
- **Perfil:** Administrador
- **Setor:** SEFAZ

### Usuário Gestor
- **Usuário:** `gestor`
- **Senha:** `gestor123`
- **Perfil:** Gestor
- **Setor:** SEFAZ

### Usuário Consulta
- **Usuário:** `usuario`
- **Senha:** `usuario123`
- **Perfil:** Consulta
- **Setor:** SEFAZ

---

## Como Adicionar Novos Usuários

Para adicionar novos usuários ao sistema:

1. Abra o arquivo `index.html`
2. Localize a seção `// === USUÁRIOS DO SISTEMA ===`
3. Adicione um novo objeto na lista `usuarios`:

```javascript
{
  username: 'nome_usuario',
  password: 'senha_usuario',
  nome: 'Nome Completo',
  perfil: 'Cargo/Perfil',
  setor: 'SEFAZ'
}
```

### Exemplo de Adição de Usuário:

```javascript
var usuarios = [
  {
    username: 'admin',
    password: 'admin123',
    nome: 'Administrador',
    perfil: 'Administrador',
    setor: 'SEFAZ'
  },
  // Adicione aqui 👇
  {
    username: 'maria.silva',
    password: 'senha@2024',
    nome: 'Maria Silva',
    perfil: 'Analista Financeiro',
    setor: 'SEFAZ'
  }
];
```

---

## Como Alterar Senhas

Para alterar a senha de um usuário existente:

1. Abra o arquivo `index.html`
2. Localize o usuário na lista `usuarios`
3. Modifique o valor do campo `password`

```javascript
// Antes
{
  username: 'admin',
  password: 'admin123',  // Senha antiga
  ...
}

// Depois
{
  username: 'admin',
  password: 'novaSenha@2024',  // Senha nova
  ...
}
```

---

## Sessão e Segurança

- **Duração da Sessão:** 24 horas
- **Token:** Gerado automaticamente no login
- **Armazenamento:** LocalStorage do navegador
- **Expiração:** Após 24 horas de inatividade, o usuário precisa fazer login novamente

### Logout Manual

Para fazer logout manualmente:
1. Acesse o Console do navegador (F12)
2. Execute os comandos:
```javascript
localStorage.removeItem('auth_token');
localStorage.removeItem('auth_time');
localStorage.removeItem('user_data');
location.reload();
```

---

## Segurança e Recomendações

⚠️ **IMPORTANTE:**

1. **Altere as senhas padrão** imediatamente após a primeira instalação
2. **Use senhas fortes** com letras, números e caracteres especiais
3. **Não compartilhe credenciais** entre usuários
4. **Faça backup** do arquivo `index.html` após alterações
5. **Restrinja o acesso físico** aos arquivos do sistema
6. Este sistema é adequado para **redes internas/corporativas**
7. Para ambientes com internet pública, considere implementar um backend completo com criptografia

---

## Níveis de Acesso

Atualmente o sistema possui acesso total para todos os usuários autenticados. Para implementar níveis de acesso diferentes (leitura, edição, exclusão), será necessário expandir o sistema de autenticação.

---

## Suporte

Para dúvidas ou problemas com autenticação, entre em contato com o administrador do sistema.

**Prefeitura Municipal de Caruaru - SEFAZ**
