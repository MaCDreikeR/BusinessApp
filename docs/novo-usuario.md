# Tela de Criação de Novo Usuário

## Localização
- **Arquivo**: `app/(app)/usuarios/novo.tsx`
- **Rota**: `/usuarios/novo`

## Acesso
A tela de criação de novos usuários é acessível apenas por:
- Usuários com `role = 'admin'`
- Usuários com `is_principal = true`

O acesso é controlado automaticamente na tela, redirecionando usuários sem permissão.

## Funcionalidades

### Formulário de Criação
1. **Foto de Perfil** (Opcional)
   - Upload de imagem através da galeria
   - Preview da imagem selecionada
   - Storage no Supabase Storage (bucket 'avatars')

2. **Dados Básicos**
   - **Nome Completo** (obrigatório)
   - **Email** (obrigatório, validação de formato)
   - **Telefone** (opcional, formatação automática)

3. **Senha de Acesso**
   - **Senha** (obrigatório, mínimo 6 caracteres)
   - **Confirmar Senha** (deve coincidir)
   - Toggle para mostrar/ocultar senhas

4. **Tipo de Usuário**
   - Opção entre "Funcionário" e "Profissional"
   - Checkbox "Faz Atendimento" (padrão: marcado)

### Validações
- Nome completo obrigatório
- Email obrigatório e formato válido
- Senha mínima de 6 caracteres
- Confirmação de senha deve coincidir
- Verificação de email já existente

### Processo de Criação
1. **Validação do formulário**
2. **Criação no Supabase Auth** (`supabase.auth.signUp`)
3. **Upload do avatar** (se fornecido)
4. **Criação do registro na tabela `usuarios`** com:
   - ID do auth.users
   - Dados do formulário
   - `estabelecimento_id` do usuário logado
   - `is_principal = false`
   - URL do avatar (se houver)

## Navegação
- **Botão "Novo Usuário"** na tela `/usuarios` (visível apenas para admins/principais)
- **Botão "Voltar"** retorna para `/usuarios`
- **Após criação** redireciona automaticamente para `/usuarios`

## Integração com Permissões
- A tela respeita o sistema de permissões existente
- Apenas usuários autorizados podem acessar
- Usuários criados herdam o `estabelecimento_id` do criador

## Componentes UI Utilizados
- `ScrollView` para rolagem do formulário
- `TouchableOpacity` para botões e seletores
- `TextInput` com formatação e validação
- `Image` e `ImagePicker` para avatar
- `Ionicons` para ícones
- Layout responsivo com cards e seções