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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
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
          peso_liquido: number
          placa_caminhao: string
          produtor_id: string
          taxa_secagem_percentual: number
          tipo_grao_id: string
          umidade_final_alvo: number
          umidade_inicial: number
          updated_at: string
          user_id: string
          valor_armazenamento: number
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
          peso_liquido?: number
          placa_caminhao: string
          produtor_id: string
          taxa_secagem_percentual?: number
          tipo_grao_id: string
          umidade_final_alvo?: number
          umidade_inicial: number
          updated_at?: string
          user_id: string
          valor_armazenamento?: number
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
          peso_liquido?: number
          placa_caminhao?: string
          produtor_id?: string
          taxa_secagem_percentual?: number
          tipo_grao_id?: string
          umidade_final_alvo?: number
          umidade_inicial?: number
          updated_at?: string
          user_id?: string
          valor_armazenamento?: number
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
        ]
      }
      saidas: {
        Row: {
          categoria: string
          classificacao: string | null
          comprador_id: string
          created_at: string
          data: string
          id: string
          kgs_expedidos: number
          placa_caminhao: string
          produtor_id: string | null
          tipo_grao_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          classificacao?: string | null
          comprador_id: string
          created_at?: string
          data?: string
          id?: string
          kgs_expedidos: number
          placa_caminhao: string
          produtor_id?: string | null
          tipo_grao_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          classificacao?: string | null
          comprador_id?: string
          created_at?: string
          data?: string
          id?: string
          kgs_expedidos?: number
          placa_caminhao?: string
          produtor_id?: string | null
          tipo_grao_id?: string | null
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "saidas_tipo_grao_id_fkey"
            columns: ["tipo_grao_id"]
            isOneToOne: false
            referencedRelation: "tipos_grao"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_grao: {
        Row: {
          created_at: string
          id: string
          nome: string
          umidade_padrao: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          umidade_padrao?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          umidade_padrao?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
