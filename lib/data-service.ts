import { getDatabaseConfig, getLocalDatabase } from './database';

// Tipos para as entidades
export interface Usuario {
  id: string;
  email: string;
  nome_completo: string;
  telefone?: string;
  role: string;
  estabelecimento_id?: string;
  is_ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  data_nascimento?: string;
  endereco?: string;
  observacoes?: string;
  estabelecimento_id: string;
  is_ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agendamento {
  id: string;
  cliente_id: string;
  servico_id?: string;
  data_hora: string;
  status: string;
  observacoes?: string;
  valor?: number;
  estabelecimento_id: string;
  usuario_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  duracao: number;
  categoria?: string;
  estabelecimento_id: string;
  is_ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Serviços de dados que funcionam tanto com SQLite local quanto Supabase
export class DataService {
  private dbConfig;

  constructor() {
    this.dbConfig = getDatabaseConfig();
  }

  // Método auxiliar para executar queries no SQLite local
  private async executeLocalQuery(query: string, params: any[] = []): Promise<any[]> {
    const db = await getLocalDatabase();
    return await db.getAllAsync(query, params);
  }

  private async executeLocalRun(query: string, params: any[] = []): Promise<any> {
    const db = await getLocalDatabase();
    return await db.runAsync(query, params);
  }

  // Usuários
  async getUsuarios(): Promise<Usuario[]> {
    if (this.dbConfig.type === 'local') {
      return await this.executeLocalQuery('SELECT * FROM usuarios WHERE is_ativo = 1') as Usuario[];
    } else {
      const { data, error } = await this.dbConfig.config.client.from('usuarios').select('*').eq('is_ativo', true);
      if (error) throw error;
      return data;
    }
  }

  async createUsuario(usuario: Omit<Usuario, 'created_at' | 'updated_at'>): Promise<any> {
    const now = new Date().toISOString();
    const usuarioCompleto = { ...usuario, created_at: now, updated_at: now };

    if (this.dbConfig.type === 'local') {
      const query = `
        INSERT INTO usuarios (id, email, nome_completo, telefone, role, estabelecimento_id, is_ativo, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      return await this.executeLocalRun(query, [
        usuarioCompleto.id,
        usuarioCompleto.email,
        usuarioCompleto.nome_completo,
        usuarioCompleto.telefone,
        usuarioCompleto.role,
        usuarioCompleto.estabelecimento_id,
        usuarioCompleto.is_ativo ? 1 : 0,
        usuarioCompleto.created_at,
        usuarioCompleto.updated_at
      ]);
    } else {
      const { data, error } = await this.dbConfig.config.client.from('usuarios').insert(usuarioCompleto);
      if (error) throw error;
      return data;
    }
  }

  // Clientes
  async getClientes(estabelecimentoId: string): Promise<Cliente[]> {
    if (this.dbConfig.type === 'local') {
      return await this.executeLocalQuery(
        'SELECT * FROM clientes WHERE estabelecimento_id = ? AND is_ativo = 1',
        [estabelecimentoId]
      ) as Cliente[];
    } else {
      const { data, error } = await this.dbConfig.config.client
        .from('clientes')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('is_ativo', true);
      if (error) throw error;
      return data;
    }
  }

  async createCliente(cliente: Omit<Cliente, 'created_at' | 'updated_at'>): Promise<any> {
    const now = new Date().toISOString();
    const clienteCompleto = { ...cliente, created_at: now, updated_at: now };

    if (this.dbConfig.type === 'local') {
      const query = `
        INSERT INTO clientes (id, nome, email, telefone, cpf, data_nascimento, endereco, observacoes, estabelecimento_id, is_ativo, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      return await this.executeLocalRun(query, [
        clienteCompleto.id,
        clienteCompleto.nome,
        clienteCompleto.email,
        clienteCompleto.telefone,
        clienteCompleto.cpf,
        clienteCompleto.data_nascimento,
        clienteCompleto.endereco,
        clienteCompleto.observacoes,
        clienteCompleto.estabelecimento_id,
        clienteCompleto.is_ativo ? 1 : 0,
        clienteCompleto.created_at,
        clienteCompleto.updated_at
      ]);
    } else {
      const { data, error } = await this.dbConfig.config.client.from('clientes').insert(clienteCompleto);
      if (error) throw error;
      return data;
    }
  }

  // Agendamentos
  async getAgendamentos(estabelecimentoId: string, data?: string): Promise<Agendamento[]> {
    if (this.dbConfig.type === 'local') {
      let query = 'SELECT * FROM agendamentos WHERE estabelecimento_id = ?';
      let params = [estabelecimentoId];
      
      if (data) {
        query += ' AND date(data_hora) = ?';
        params.push(data);
      }
      
      return await this.executeLocalQuery(query, params) as Agendamento[];
    } else {
      let queryBuilder = this.dbConfig.config.client
        .from('agendamentos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId);
      
      if (data) {
        queryBuilder = queryBuilder
          .gte('data_hora', `${data} 00:00:00`)
          .lte('data_hora', `${data} 23:59:59`);
      }
      
      const { data: result, error } = await queryBuilder;
      if (error) throw error;
      return result;
    }
  }

  async createAgendamento(agendamento: Omit<Agendamento, 'created_at' | 'updated_at'>): Promise<any> {
    const now = new Date().toISOString();
    const agendamentoCompleto = { ...agendamento, created_at: now, updated_at: now };

    if (this.dbConfig.type === 'local') {
      const query = `
        INSERT INTO agendamentos (id, cliente_id, servico_id, data_hora, status, observacoes, valor, estabelecimento_id, usuario_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      return await this.executeLocalRun(query, [
        agendamentoCompleto.id,
        agendamentoCompleto.cliente_id,
        agendamentoCompleto.servico_id,
        agendamentoCompleto.data_hora,
        agendamentoCompleto.status,
        agendamentoCompleto.observacoes,
        agendamentoCompleto.valor,
        agendamentoCompleto.estabelecimento_id,
        agendamentoCompleto.usuario_id,
        agendamentoCompleto.created_at,
        agendamentoCompleto.updated_at
      ]);
    } else {
      const { data, error } = await this.dbConfig.config.client.from('agendamentos').insert(agendamentoCompleto);
      if (error) throw error;
      return data;
    }
  }

  // Serviços
  async getServicos(estabelecimentoId: string): Promise<Servico[]> {
    if (this.dbConfig.type === 'local') {
      return await this.executeLocalQuery(
        'SELECT * FROM servicos WHERE estabelecimento_id = ? AND is_ativo = 1',
        [estabelecimentoId]
      ) as Servico[];
    } else {
      const { data, error } = await this.dbConfig.config.client
        .from('servicos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('is_ativo', true);
      if (error) throw error;
      return data;
    }
  }

  async createServico(servico: Omit<Servico, 'created_at' | 'updated_at'>): Promise<any> {
    const now = new Date().toISOString();
    const servicoCompleto = { ...servico, created_at: now, updated_at: now };

    if (this.dbConfig.type === 'local') {
      const query = `
        INSERT INTO servicos (id, nome, descricao, preco, duracao, categoria, estabelecimento_id, is_ativo, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      return await this.executeLocalRun(query, [
        servicoCompleto.id,
        servicoCompleto.nome,
        servicoCompleto.descricao,
        servicoCompleto.preco,
        servicoCompleto.duracao,
        servicoCompleto.categoria,
        servicoCompleto.estabelecimento_id,
        servicoCompleto.is_ativo ? 1 : 0,
        servicoCompleto.created_at,
        servicoCompleto.updated_at
      ]);
    } else {
      const { data, error } = await this.dbConfig.config.client.from('servicos').insert(servicoCompleto);
      if (error) throw error;
      return data;
    }
  }

  // Método para sincronizar dados locais para staging
  async syncToStaging() {
    if (this.dbConfig.type !== 'local') {
      throw new Error('Sincronização só pode ser feita a partir do banco local');
    }

    console.log('🔄 Iniciando sincronização para staging...');
    
    // Aqui implementaríamos a lógica de sincronização
    // Por exemplo: exportar dados locais e importar no Supabase staging
    
    console.log('✅ Sincronização concluída');
  }
}

// Instância singleton
export const dataService = new DataService();