// Edge Function para verificar agendamentos e criar comandas automaticamente
// Executa a cada 5 minutos via GitHub Actions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    console.log('🔍 Iniciando verificação de agendamentos...')

    // Cliente Supabase com permissões de serviço (service_role_key)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente não configuradas')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Janela de tempo: -5min a +5min do horário atual
    const agora = new Date()
    const cincoMinutosAntes = new Date(agora.getTime() - 5 * 60000)
    const cincoMinutosDepois = new Date(agora.getTime() + 5 * 60000)

    console.log(`⏰ Verificando agendamentos entre ${cincoMinutosAntes.toISOString()} e ${cincoMinutosDepois.toISOString()}`)

    // Buscar agendamentos que estão iniciando
    const { data: agendamentos, error: agendamentosError } = await supabase
      .from('agendamentos')
      .select('id, cliente, data_hora, servicos, status, usuario_id, estabelecimento_id')
      .gte('data_hora', cincoMinutosAntes.toISOString())
      .lte('data_hora', cincoMinutosDepois.toISOString())
      .in('status', ['agendado', 'confirmado'])

    if (agendamentosError) {
      console.error('❌ Erro ao buscar agendamentos:', agendamentosError)
      throw agendamentosError
    }

    console.log(`📋 Encontrados ${agendamentos?.length || 0} agendamentos`)

    let comandasCriadas = 0
    let comandasExistentes = 0
    let erros = 0

    // Processar cada agendamento
    for (const agendamento of agendamentos || []) {
      try {
        console.log(`\n👤 Processando agendamento de ${agendamento.cliente}...`)

        // Verificar se já existe comanda aberta para este cliente hoje
        const inicioDoDia = new Date()
        inicioDoDia.setHours(0, 0, 0, 0)

        const { data: comandaExistente } = await supabase
          .from('comandas')
          .select('id')
          .eq('cliente_nome', agendamento.cliente)
          .eq('estabelecimento_id', agendamento.estabelecimento_id)
          .eq('status', 'aberta')
          .gte('data_abertura', inicioDoDia.toISOString())
          .maybeSingle()

        if (comandaExistente) {
          console.log(`✅ Comanda já existe para ${agendamento.cliente} (ID: ${comandaExistente.id})`)
          comandasExistentes++
          continue
        }

        // Buscar cliente_id (obrigatório para criar comanda)
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('id')
          .ilike('nome', agendamento.cliente)
          .eq('estabelecimento_id', agendamento.estabelecimento_id)
          .maybeSingle()

        if (clienteError || !clienteData) {
          console.log(`⚠️ Cliente não encontrado: ${agendamento.cliente}`)
          erros++
          continue
        }

        console.log(`📝 Cliente encontrado: ${clienteData.id}`)

        // Criar comanda
        const { data: novaComanda, error: comandaError } = await supabase
          .from('comandas')
          .insert({
            cliente_nome: agendamento.cliente,
            cliente_id: clienteData.id,
            estabelecimento_id: agendamento.estabelecimento_id,
            status: 'aberta',
            valor_total: 0,
            created_by_user_id: agendamento.usuario_id,
            data_abertura: new Date().toISOString(),
          })
          .select()
          .single()

        if (comandaError) {
          console.error(`❌ Erro ao criar comanda:`, comandaError)
          erros++
          continue
        }

        console.log(`✅ Comanda criada: ${novaComanda.id}`)

        // Adicionar itens (serviços) à comanda
        const itens = agendamento.servicos.map((servico: any) => ({
          comanda_id: novaComanda.id,
          tipo: 'servico',
          nome: servico.nome,
          preco_unitario: parseFloat(servico.preco),
          preco: parseFloat(servico.preco),
          quantidade: 1,
          preco_total: parseFloat(servico.preco),
          estabelecimento_id: agendamento.estabelecimento_id,
        }))

        console.log(`📦 Inserindo ${itens.length} itens na comanda...`)

        const { error: itensError } = await supabase
          .from('comandas_itens')
          .insert(itens)

        if (itensError) {
          console.error(`❌ Erro ao inserir itens:`, itensError)
          erros++
          continue
        }

        // Calcular e atualizar valor total
        const valorTotal = itens.reduce((sum: number, item: any) => sum + item.preco_total, 0)

        const { error: updateError } = await supabase
          .from('comandas')
          .update({ valor_total: valorTotal })
          .eq('id', novaComanda.id)

        if (updateError) {
          console.error(`❌ Erro ao atualizar valor total:`, updateError)
        }

        console.log(`💰 Valor total da comanda: R$ ${valorTotal.toFixed(2)}`)
        console.log(`✅ Comanda completa para ${agendamento.cliente}!`)
        
        comandasCriadas++

      } catch (error) {
        console.error(`❌ Erro ao processar agendamento:`, error)
        erros++
      }
    }

    // Resposta final
    const resultado = {
      success: true,
      timestamp: new Date().toISOString(),
      estatisticas: {
        agendamentos_encontrados: agendamentos?.length || 0,
        comandas_criadas: comandasCriadas,
        comandas_existentes: comandasExistentes,
        erros: erros,
      }
    }

    console.log('\n📊 Resultado final:', resultado)

    return new Response(
      JSON.stringify(resultado),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" } 
      }
    )

  } catch (error) {
    console.error('❌ Erro fatal:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    )
  }
})
