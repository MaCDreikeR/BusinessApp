# ⚡ AÇÃO IMEDIATA - Corrigir Cadastro (2 Erros Resolvidos)

## 🎯 O Que Fazer AGORA

### Passo 1: Recompile o App (2 minutos)

**No Terminal/PowerShell**:
```bash
# Pare o Metro se estiver rodando (Ctrl+C)
# Depois execute:

npm start

# Aguarde ~30 segundos até ver:
# 📱 Pressione 'r' para reload ou abra no Expo Go
```

### Passo 2: Teste no Emulador (3 minutos)

1. **Abra o app** no emulador/Expo Go
2. **Vá para**: Tela de Cadastro
3. **Preencha com dados válidos**:
   ```
   Nome Completo: Seu Nome Aqui
   Email: seu.email@gmail.com
   
   ⬅️ Enquanto digita o email, veja:
   ✓ Ícone VERDE se for válido
   ✗ Ícone VERMELHO se for inválido
   
   Senha: SenhaForte123
   Confirmar: SenhaForte123
   Estabelecimento: Seu Negócio
   CPF: 123.456.789-99
   Telefone: 85987654321
   Segmento: Beleza (ou outro)
   ```
4. **Clique**: "Cadastrar"
5. **Resultado**: Deve aparecer "Cadastro realizado com sucesso!"

---

## ✅ Se Funcionou

**Parabéns!** 🎉 Ambos os erros foram corrigidos:
- ✅ Slug agora é gerado automaticamente
- ✅ Email é validado antes de enviar

**Próximo passo**: Use a conta para acessar o app!

---

## ❌ Se Ainda Deu Erro

### Erro: "Email inválido"
- Verifique o formato: `usuario@dominio.com`
- Evite: pontos seguidos (..), caracteres especiais
- Tente: `seu.nome@gmail.com`

### Erro: "Slug nulo"
- **Não deveria acontecer mais**, mas se acontecer:
  - Pare o app: `Ctrl+C`
  - Limpe cache: `rm -r .expo/`
  - Reinicie: `npm start`

### Erro: "Estabelecimento não foi criado"
- Significa que insert no Supabase falhou
- Verifique logs no terminal para detalhes

---

## 🧪 Teste Rápido de Validação de Email

Enquanto digita no campo de email, teste:

| Email | Resultado Esperado |
|-------|-------------------|
| `usuario@email.com` | ✓ Verde (válido) |
| `nome.sobrenome@email.co.uk` | ✓ Verde (válido) |
| `usuario..email@email.com` | ✗ Vermelho (inválido) |
| `usuario@email` | ✗ Vermelho (inválido - sem .com) |
| `@email.com` | ✗ Vermelho (inválido - sem localpart) |

---

## 📱 Código Modificado (Resumo)

Se quiser ver o que foi mudado:

**1. Validação de Email** (`utils/validators.ts`)
- Usa regex RFC 5322 compatível com Supabase
- Verifica pontos consecutivos, caracteres especiais, etc

**2. Cadastro Atualizado** (`app/(auth)/cadastro.tsx`)
- Gera slug com `gerarSlugUnico()` antes de inserir
- Mostra ícone vísula de validação
- Mensagens de erro mais específicas

**3. Migração Disponível** (opcional)
- `supabase/migrations/20260302_fix_criar_nova_conta_slug.sql`
- Atualiza RPC do lado servidor (redundância)

---

## 🔄 Fluxo Completo Agora

```
Usuario preenche formulário
    ↓
Validação de email em tempo real ← NOVO!
    ↓
Submete formulário
    ↓
Validações finais (senha, CPF, etc)
    ↓
Cria usuário em Auth
    ↓
Gera slug localmente ← NOVO!
    ↓
Insert com slug (sem erro!)
    ↓
✅ Cadastro OK
```

---

## 💡 Dicas

1. **Use email real** - Supabase pode enviar email de confirmação
2. **Senha forte** - Mínimo 8 caracteres com letras/números (recomendado)
3. **Documento único** - CPF/CNPJ não pode repetir na mesma conta
4. **Domínio válido** - Email precisa ter domínio real (.com, .co.uk, etc)

---

## 📞 Próximas Ações

- [ ] Reiniciei app com `npm start`
- [ ] Testei cadastro com email válido
- [ ] Vi ícone ✓ verde no email
- [ ] Cadastro foi bem-sucedido
- [ ] Criei conta com sucesso

Quando tudo acima estiver ✅ → **Pronto para usar!** 🚀

---

**Tempo total**: ~5 minutos  
**Dificuldade**: Fácil (só recompile)  
**Resultado**: Cadastro 100% funcional ✨
