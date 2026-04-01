export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      animais: {
        Row: {
          brinco: string
          categoria: string
          cor: string | null
          created_at: string | null
          data_entrada: string | null
          data_nascimento: string | null
          foto_url: string | null
          id: string
          lote_id: string | null
          mae_brinco: string | null
          nome: string | null
          observacoes: string | null
          origem: string | null
          pai_brinco: string | null
          pasto_id: string | null
          peso_atual: number | null
          raca_id: string | null
          sexo: string
          status: string | null
          user_id: string
        }
        Insert: {
          brinco: string
          categoria: string
          cor?: string | null
          created_at?: string | null
          data_entrada?: string | null
          data_nascimento?: string | null
          foto_url?: string | null
          id?: string
          lote_id?: string | null
          mae_brinco?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          pai_brinco?: string | null
          pasto_id?: string | null
          peso_atual?: number | null
          raca_id?: string | null
          sexo: string
          status?: string | null
          user_id: string
        }
        Update: {
          brinco?: string
          categoria?: string
          cor?: string | null
          created_at?: string | null
          data_entrada?: string | null
          data_nascimento?: string | null
          foto_url?: string | null
          id?: string
          lote_id?: string | null
          mae_brinco?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          pai_brinco?: string | null
          pasto_id?: string | null
          peso_atual?: number | null
          raca_id?: string | null
          sexo?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animais_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animais_raca_id_fkey"
            columns: ["raca_id"]
            isOneToOne: false
            referencedRelation: "racas"
            referencedColumns: ["id"]
          },
        ]
      }
      aplicacoes_sanitarias: {
        Row: {
          animal_id: string | null
          created_at: string | null
          data_aplicacao: string
          dose: string | null
          id: string
          lote_id: string | null
          medicamento_id: string
          observacao: string | null
          proxima_dose: string | null
          user_id: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string | null
          data_aplicacao?: string
          dose?: string | null
          id?: string
          lote_id?: string | null
          medicamento_id: string
          observacao?: string | null
          proxima_dose?: string | null
          user_id: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string | null
          data_aplicacao?: string
          dose?: string | null
          id?: string
          lote_id?: string | null
          medicamento_id?: string
          observacao?: string | null
          proxima_dose?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aplicacoes_sanitarias_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacoes_sanitarias_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aplicacoes_sanitarias_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_financeiras: {
        Row: {
          cor: string | null
          created_at: string
          id: string
          nome: string
          pai_id: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          pai_id?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          pai_id?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financeiras_pai_id_fkey"
            columns: ["pai_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string
          icone: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      compradores: {
        Row: {
          contato: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contato?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contato?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          ativa: boolean | null
          banco: string | null
          created_at: string
          id: string
          nome: string
          saldo_atual: number | null
          saldo_inicial: number | null
          user_id: string
        }
        Insert: {
          ativa?: boolean | null
          banco?: string | null
          created_at?: string
          id?: string
          nome: string
          saldo_atual?: number | null
          saldo_inicial?: number | null
          user_id: string
        }
        Update: {
          ativa?: boolean | null
          banco?: string | null
          created_at?: string
          id?: string
          nome?: string
          saldo_atual?: number | null
          saldo_inicial?: number | null
          user_id?: string
        }
        Relationships: []
      }
      contas_pr: {
        Row: {
          categoria_id: string | null
          centro_custo_id: string
          conta_bancaria_id: string | null
          contato_id: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          id: string
          observacao: string | null
          recorrente: boolean | null
          status: string | null
          tipo: string
          user_id: string
          valor_pago: number | null
          valor_total: number
        }
        Insert: {
          categoria_id?: string | null
          centro_custo_id: string
          conta_bancaria_id?: string | null
          contato_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          observacao?: string | null
          recorrente?: boolean | null
          status?: string | null
          tipo: string
          user_id: string
          valor_pago?: number | null
          valor_total: number
        }
        Update: {
          categoria_id?: string | null
          centro_custo_id?: string
          conta_bancaria_id?: string | null
          contato_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          observacao?: string | null
          recorrente?: boolean | null
          status?: string | null
          tipo?: string
          user_id?: string
          valor_pago?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pr_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pr_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pr_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pr_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_financeiros: {
        Row: {
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacao: string | null
          telefone: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacao?: string | null
          telefone?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          telefone?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          categoria_id: string | null
          centro_custo_id: string
          conta_bancaria_id: string | null
          conta_destino_id: string | null
          conta_pr_id: string | null
          contato_id: string | null
          created_at: string
          data: string
          descricao: string | null
          id: string
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          centro_custo_id: string
          conta_bancaria_id?: string | null
          conta_destino_id?: string | null
          conta_pr_id?: string | null
          contato_id?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          centro_custo_id?: string
          conta_bancaria_id?: string | null
          conta_destino_id?: string | null
          conta_pr_id?: string | null
          contato_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_conta_pr_id_fkey"
            columns: ["conta_pr_id"]
            isOneToOne: false
            referencedRelation: "contas_pr"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          pasto_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          pasto_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          pasto_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos: {
        Row: {
          carencia_dias: number | null
          created_at: string | null
          fabricante: string | null
          id: string
          nome: string
          tipo: string
          user_id: string
        }
        Insert: {
          carencia_dias?: number | null
          created_at?: string | null
          fabricante?: string | null
          id?: string
          nome: string
          tipo: string
          user_id: string
        }
        Update: {
          carencia_dias?: number | null
          created_at?: string | null
          fabricante?: string | null
          id?: string
          nome?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      movimentacoes_gado: {
        Row: {
          animal_id: string | null
          causa_morte: string | null
          contato_id: string | null
          created_at: string | null
          data: string
          id: string
          observacao: string | null
          pasto_destino_id: string | null
          pasto_origem_id: string | null
          peso_kg: number | null
          quantidade: number | null
          tipo: string
          user_id: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          animal_id?: string | null
          causa_morte?: string | null
          contato_id?: string | null
          created_at?: string | null
          data?: string
          id?: string
          observacao?: string | null
          pasto_destino_id?: string | null
          pasto_origem_id?: string | null
          peso_kg?: number | null
          quantidade?: number | null
          tipo: string
          user_id: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          animal_id?: string | null
          causa_morte?: string | null
          contato_id?: string | null
          created_at?: string | null
          data?: string
          id?: string
          observacao?: string | null
          pasto_destino_id?: string | null
          pasto_origem_id?: string | null
          peso_kg?: number | null
          quantidade?: number | null
          tipo?: string
          user_id?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_gado_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_gado_pasto_destino_id_fkey"
            columns: ["pasto_destino_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_gado_pasto_origem_id_fkey"
            columns: ["pasto_origem_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      pastos: {
        Row: {
          area_hectares: number | null
          ativo: boolean | null
          capacidade_cabecas: number | null
          created_at: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          area_hectares?: number | null
          ativo?: boolean | null
          capacidade_cabecas?: number | null
          created_at?: string | null
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          area_hectares?: number | null
          ativo?: boolean | null
          capacidade_cabecas?: number | null
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      pesagens: {
        Row: {
          animal_id: string | null
          created_at: string | null
          data: string
          gmd: number | null
          id: string
          observacao: string | null
          peso_kg: number
          user_id: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string | null
          data?: string
          gmd?: number | null
          id?: string
          observacao?: string | null
          peso_kg: number
          user_id: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string | null
          data?: string
          gmd?: number | null
          id?: string
          observacao?: string | null
          peso_kg?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesagens_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
        ]
      }
      produtores: {
        Row: {
          cidade: string | null
          created_at: string
          documento: string
          endereco_fazenda: string | null
          estado: string | null
          fazenda: string | null
          id: string
          inscricao_estadual: string | null
          nome: string
          telefone: string | null
          tipo_documento: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          documento: string
          endereco_fazenda?: string | null
          estado?: string | null
          fazenda?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome: string
          telefone?: string | null
          tipo_documento?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          documento?: string
          endereco_fazenda?: string | null
          estado?: string | null
          fazenda?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome?: string
          telefone?: string | null
          tipo_documento?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          exibir_conversao: boolean | null
          farm_name: string | null
          farm_name_financeiro: string | null
          farm_name_gado: string | null
          formato_numero: string | null
          id: string
          master_password_hash: string | null
          moeda: string | null
          rendimento_carcaca: number | null
          unidade_peso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          exibir_conversao?: boolean | null
          farm_name?: string | null
          farm_name_financeiro?: string | null
          farm_name_gado?: string | null
          formato_numero?: string | null
          id?: string
          master_password_hash?: string | null
          moeda?: string | null
          rendimento_carcaca?: number | null
          unidade_peso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          exibir_conversao?: boolean | null
          farm_name?: string | null
          farm_name_financeiro?: string | null
          farm_name_gado?: string | null
          formato_numero?: string | null
          id?: string
          master_password_hash?: string | null
          moeda?: string | null
          rendimento_carcaca?: number | null
          unidade_peso?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quebras_tecnicas: {
        Row: {
          created_at: string
          data: string
          id: string
          justificativa: string
          kg_ajuste: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          justificativa: string
          kg_ajuste: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          justificativa?: string
          kg_ajuste?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      racas: {
        Row: {
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      recebimentos: {
        Row: {
          created_at: string
          data: string
          desconto_impureza_kg: number
          desconto_secagem_kg: number
          desconto_umidade_kg: number
          desconto_umidade_percent: number
          id: string
          impureza: number
          peso_bruto: number
          peso_grao_seco: number
          peso_liquido: number
          placa_caminhao: string
          produtor_id: string
          saldo_restante_kg: number
          taxa_secagem_percentual: number
          tipo_grao_id: string
          umidade_final_alvo: number
          umidade_inicial: number
          updated_at: string
          user_id: string
          valor_armazenamento: number
          variedade_id: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          desconto_impureza_kg?: number
          desconto_secagem_kg?: number
          desconto_umidade_kg?: number
          desconto_umidade_percent?: number
          id?: string
          impureza?: number
          peso_bruto: number
          peso_grao_seco?: number
          peso_liquido?: number
          placa_caminhao: string
          produtor_id: string
          saldo_restante_kg?: number
          taxa_secagem_percentual?: number
          tipo_grao_id: string
          umidade_final_alvo?: number
          umidade_inicial: number
          updated_at?: string
          user_id: string
          valor_armazenamento?: number
          variedade_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          desconto_impureza_kg?: number
          desconto_secagem_kg?: number
          desconto_umidade_kg?: number
          desconto_umidade_percent?: number
          id?: string
          impureza?: number
          peso_bruto?: number
          peso_grao_seco?: number
          peso_liquido?: number
          placa_caminhao?: string
          produtor_id?: string
          saldo_restante_kg?: number
          taxa_secagem_percentual?: number
          tipo_grao_id?: string
          umidade_final_alvo?: number
          umidade_inicial?: number
          updated_at?: string
          user_id?: string
          valor_armazenamento?: number
          variedade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "produtores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_tipo_grao_id_fkey"
            columns: ["tipo_grao_id"]
            isOneToOne: false
            referencedRelation: "tipos_grao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_variedade_id_fkey"
            columns: ["variedade_id"]
            isOneToOne: false
            referencedRelation: "variedades_grao"
            referencedColumns: ["id"]
          },
        ]
      }
      reproducao: {
        Row: {
          bezerro_id: string | null
          created_at: string | null
          data_cobertura: string
          data_diagnostico: string | null
          data_parto_prevista: string | null
          data_parto_real: string | null
          diagnostico: string | null
          femea_id: string
          id: string
          macho_id: string | null
          observacao: string | null
          semen_info: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          bezerro_id?: string | null
          created_at?: string | null
          data_cobertura: string
          data_diagnostico?: string | null
          data_parto_prevista?: string | null
          data_parto_real?: string | null
          diagnostico?: string | null
          femea_id: string
          id?: string
          macho_id?: string | null
          observacao?: string | null
          semen_info?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          bezerro_id?: string | null
          created_at?: string | null
          data_cobertura?: string
          data_diagnostico?: string | null
          data_parto_prevista?: string | null
          data_parto_real?: string | null
          diagnostico?: string | null
          femea_id?: string
          id?: string
          macho_id?: string | null
          observacao?: string | null
          semen_info?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reproducao_bezerro_id_fkey"
            columns: ["bezerro_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reproducao_femea_id_fkey"
            columns: ["femea_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reproducao_macho_id_fkey"
            columns: ["macho_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
        ]
      }
      saidas: {
        Row: {
          categoria: string
          classificacao: string | null
          composicao_peps: Json | null
          comprador_id: string
          created_at: string
          data: string
          dias_armazenados: number
          id: string
          kgs_expedidos: number
          peso_ajustado: number
          placa_caminhao: string
          produtor_id: string | null
          quinzenas_cobradas: number
          recebimento_id: string | null
          tipo_grao_id: string | null
          umidade_combinada: number
          umidade_saida: number
          updated_at: string
          user_id: string
          valor_armazenamento_exp: number
          valor_expedicao: number
          variedade_id: string | null
        }
        Insert: {
          categoria?: string
          classificacao?: string | null
          composicao_peps?: Json | null
          comprador_id: string
          created_at?: string
          data?: string
          dias_armazenados?: number
          id?: string
          kgs_expedidos: number
          peso_ajustado?: number
          placa_caminhao: string
          produtor_id?: string | null
          quinzenas_cobradas?: number
          recebimento_id?: string | null
          tipo_grao_id?: string | null
          umidade_combinada?: number
          umidade_saida?: number
          updated_at?: string
          user_id: string
          valor_armazenamento_exp?: number
          valor_expedicao?: number
          variedade_id?: string | null
        }
        Update: {
          categoria?: string
          classificacao?: string | null
          composicao_peps?: Json | null
          comprador_id?: string
          created_at?: string
          data?: string
          dias_armazenados?: number
          id?: string
          kgs_expedidos?: number
          peso_ajustado?: number
          placa_caminhao?: string
          produtor_id?: string | null
          quinzenas_cobradas?: number
          recebimento_id?: string | null
          tipo_grao_id?: string | null
          umidade_combinada?: number
          umidade_saida?: number
          updated_at?: string
          user_id?: string
          valor_armazenamento_exp?: number
          valor_expedicao?: number
          variedade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saidas_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "compradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "produtores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "recebimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_tipo_grao_id_fkey"
            columns: ["tipo_grao_id"]
            isOneToOne: false
            referencedRelation: "tipos_grao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_variedade_id_fkey"
            columns: ["variedade_id"]
            isOneToOne: false
            referencedRelation: "variedades_grao"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_grao: {
        Row: {
          created_at: string
          id: string
          nome: string
          taxa_agio: number
          taxa_desagio: number
          umidade_padrao: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          taxa_agio?: number
          taxa_desagio?: number
          umidade_padrao?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          taxa_agio?: number
          taxa_desagio?: number
          umidade_padrao?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      variedades_grao: {
        Row: {
          created_at: string
          grao_id: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grao_id: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grao_id?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variedades_grao_grao_id_fkey"
            columns: ["grao_id"]
            isOneToOne: false
            referencedRelation: "tipos_grao"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
