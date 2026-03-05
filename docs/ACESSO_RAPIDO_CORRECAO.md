# ⚡ AÇÃO RÁPIDA - Cadastro com Erro de Slug

## 🎯 O que fazer AGORA

### Passo 1: Recarregar o App
```
1. Abra o terminal onde rodá o "npm start"
2. Pressione Ctrl+C (para parar)
3. Digite: npm start
4. Aguarde Metro compilar (levará ~30 segundos)
5. Pressione "r" no terminal para reload
```

### Passo 2: Testar no Emulador/Dispositivo
```
1. Abra app e vá para cadastro
2. Preencha todos os campos
3. Clique em "Cadastrar"
4. Se aparecer "Cadastro realizado com sucesso!" → ✅ RESOLVIDO!
```

### Passo 3: Se Ainda Desse Erro
```
1. Feche o app completamente
2. Limpe cache do Metro: Ctrl+C então "npm start"
3. Reinstale o APK no emulador (opcional, para estar 100% certo):
   - npx expo prebuild --platform android --clean
   - cd android
   - ./gradlew assembleRelease
   - adb install app/build/outputs/apk/release/app-release.apk
4. Tente o cadastro novamente
```

---

## 📋 Alterações Feitas (Resumo Técnico)

### Arquivo: `app/(auth)/cadastro.tsx`

**Antes** (Não funcionava):
```typescript
const { data: contaData, error: contaError } = await supabase.rpc('criar_nova_conta', {
  p_nome_estabelecimento: nomeEstabelecimento,
  // ... sem slug!
});
```

**Depois** (Funciona):
```typescript
// 1. Gerar slug
const novoSlug = await gerarSlugUnico(nomeEstabelecimento);

// 2. Insert direto com slug
const { data: estabelecimentoData, error: estError } = await supabase
  .from('estabelecimentos')
  .insert([{
    nome: nomeEstabelecimento,
    slug: novoSlug,  // ← Slug agora é incluído!
    // ... outros campos
  }]);
```

---

## 🆘 Ainda com Dúvidas?

**Erro aparece novamente?**
- Significa que código antigo ainda está em cache
- Solução: Limpar cache completamente:
  ```bash
  rm -r .expo
  npm install
  npm start
  ```

**Não sabe qual é o arquivo `cadastro.tsx`?**
- Está em: `BusinessApp/app/(auth)/cadastro.tsx`
- Já foi corrigido automaticamente

**Quer fazer manualmente?**
- Arquivo foi editado em: **2026-03-02 18:15 UTC**
- Procure por: `// ✨ NOVO: Gerar slug único localmente`

---

## ✅ Checklist Final

- [ ] Parei o "npm start" (Ctrl+C)
- [ ] Executei "npm start" novamente
- [ ] Aguardei compilação do Metro
- [ ] Testei cadastro no app
- [ ] Recebi mensagem de sucesso
- [ ] Criei nova conta com sucesso

Se tudo acima está marcado ✅ → **Problema resolvido!**

---

**Tempo estimado**: 2-5 minutos  
**Dificuldade**: Fácil (só recompilar)  
**Risco**: Nenhum (backups automáticos do Git)
