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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      albuns: {
        Row: {
          capa: string | null
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          publicado: boolean
          slug: string
          titulo: string
          updated_at: string
        }
        Insert: {
          capa?: string | null
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          publicado?: boolean
          slug: string
          titulo: string
          updated_at?: string
        }
        Update: {
          capa?: string | null
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          publicado?: boolean
          slug?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      arquivos: {
        Row: {
          arquivo: string
          created_at: string
          id: string
          nome: string
          tamanho: number | null
          tipo: string | null
          uploaded_by: string | null
        }
        Insert: {
          arquivo: string
          created_at?: string
          id?: string
          nome: string
          tamanho?: number | null
          tipo?: string | null
          uploaded_by?: string | null
        }
        Update: {
          arquivo?: string
          created_at?: string
          id?: string
          nome?: string
          tamanho?: number | null
          tipo?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          slug: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          slug: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          slug?: string
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          conteudo: string
          created_at: string
          email: string
          id: string
          nome: string
          postagem_id: string
          status: Database["public"]["Enums"]["comment_status"]
        }
        Insert: {
          conteudo: string
          created_at?: string
          email: string
          id?: string
          nome: string
          postagem_id: string
          status?: Database["public"]["Enums"]["comment_status"]
        }
        Update: {
          conteudo?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          postagem_id?: string
          status?: Database["public"]["Enums"]["comment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_postagem_id_fkey"
            columns: ["postagem_id"]
            isOneToOne: false
            referencedRelation: "postagens"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          banner_principal: string | null
          banner_subtitulo: string | null
          banner_titulo: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          email: string | null
          endereco: string | null
          facebook: string | null
          favicon: string | null
          horarios_atendimento: string | null
          id: number
          instagram: string | null
          logo: string | null
          logo_dark: string | null
          meta_description: string | null
          meta_title: string | null
          nome_paroquia: string
          nome_site: string
          rodape: string | null
          site_externo: string | null
          slogan: string | null
          subtitulo: string | null
          telefone: string | null
          texto_institucional: string | null
          updated_at: string
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          banner_principal?: string | null
          banner_subtitulo?: string | null
          banner_titulo?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          email?: string | null
          endereco?: string | null
          facebook?: string | null
          favicon?: string | null
          horarios_atendimento?: string | null
          id?: number
          instagram?: string | null
          logo?: string | null
          logo_dark?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nome_paroquia?: string
          nome_site?: string
          rodape?: string | null
          site_externo?: string | null
          slogan?: string | null
          subtitulo?: string | null
          telefone?: string | null
          texto_institucional?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          banner_principal?: string | null
          banner_subtitulo?: string | null
          banner_titulo?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          email?: string | null
          endereco?: string | null
          facebook?: string | null
          favicon?: string | null
          horarios_atendimento?: string | null
          id?: number
          instagram?: string | null
          logo?: string | null
          logo_dark?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nome_paroquia?: string
          nome_site?: string
          rodape?: string | null
          site_externo?: string | null
          slogan?: string | null
          subtitulo?: string | null
          telefone?: string | null
          texto_institucional?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      contato_mensagens: {
        Row: {
          assunto: string | null
          created_at: string
          email: string
          id: string
          lida: boolean
          mensagem: string
          nome: string
        }
        Insert: {
          assunto?: string | null
          created_at?: string
          email: string
          id?: string
          lida?: boolean
          mensagem: string
          nome: string
        }
        Update: {
          assunto?: string | null
          created_at?: string
          email?: string
          id?: string
          lida?: boolean
          mensagem?: string
          nome?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          categoria: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          destaque: boolean
          id: string
          imagem: string | null
          local: string | null
          slug: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          destaque?: boolean
          id?: string
          imagem?: string | null
          local?: string | null
          slug: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          destaque?: boolean
          id?: string
          imagem?: string | null
          local?: string | null
          slug?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      fotos: {
        Row: {
          album_id: string | null
          created_at: string
          id: string
          legenda: string | null
          ordem: number
          url: string
        }
        Insert: {
          album_id?: string | null
          created_at?: string
          id?: string
          legenda?: string | null
          ordem?: number
          url: string
        }
        Update: {
          album_id?: string | null
          created_at?: string
          id?: string
          legenda?: string | null
          ordem?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albuns"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          entidade: string | null
          entidade_id: string | null
          id: string
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      missas: {
        Row: {
          ativo: boolean
          created_at: string
          data_especial: string | null
          descricao: string | null
          dia_semana: number | null
          horario: string
          id: string
          local: string | null
          ordem: number
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_especial?: string | null
          descricao?: string | null
          dia_semana?: number | null
          horario: string
          id?: string
          local?: string | null
          ordem?: number
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_especial?: string | null
          descricao?: string | null
          dia_semana?: number | null
          horario?: string
          id?: string
          local?: string | null
          ordem?: number
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter: {
        Row: {
          confirmado: boolean
          created_at: string
          email: string
          id: string
          nome: string | null
        }
        Insert: {
          confirmado?: boolean
          created_at?: string
          email: string
          id?: string
          nome?: string | null
        }
        Update: {
          confirmado?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "postagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      postagens: {
        Row: {
          agendamento: string | null
          autor_id: string | null
          categoria_id: string | null
          conteudo: string
          created_at: string
          destaque: boolean
          fixado: boolean
          id: string
          imagem: string | null
          meta_description: string | null
          meta_title: string | null
          publicado_em: string | null
          resumo: string | null
          slug: string
          status: Database["public"]["Enums"]["post_status"]
          titulo: string
          updated_at: string
          views: number
        }
        Insert: {
          agendamento?: string | null
          autor_id?: string | null
          categoria_id?: string | null
          conteudo?: string
          created_at?: string
          destaque?: boolean
          fixado?: boolean
          id?: string
          imagem?: string | null
          meta_description?: string | null
          meta_title?: string | null
          publicado_em?: string | null
          resumo?: string | null
          slug: string
          status?: Database["public"]["Enums"]["post_status"]
          titulo: string
          updated_at?: string
          views?: number
        }
        Update: {
          agendamento?: string | null
          autor_id?: string | null
          categoria_id?: string | null
          conteudo?: string
          created_at?: string
          destaque?: boolean
          fixado?: boolean
          id?: string
          imagem?: string | null
          meta_description?: string | null
          meta_title?: string | null
          publicado_em?: string | null
          resumo?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["post_status"]
          titulo?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "postagens_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postagens_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          foto: string | null
          id: string
          nome: string
          ultimo_login: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          foto?: string | null
          id: string
          nome?: string
          ultimo_login?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          foto?: string | null
          id?: string
          nome?: string
          ultimo_login?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          nome: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          publicado: boolean
          thumbnail: string | null
          titulo: string
          url: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          publicado?: boolean
          thumbnail?: string | null
          titulo: string
          url: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          publicado?: boolean
          thumbnail?: string | null
          titulo?: string
          url?: string
        }
        Relationships: []
      }
      visitas: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          user_agent?: string | null
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
      app_role: "admin" | "editor" | "moderador"
      comment_status: "pendente" | "aprovado" | "rejeitado"
      post_status: "rascunho" | "publicado" | "agendado"
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
    Enums: {
      app_role: ["admin", "editor", "moderador"],
      comment_status: ["pendente", "aprovado", "rejeitado"],
      post_status: ["rascunho", "publicado", "agendado"],
    },
  },
} as const
