-- Migration: Create notifications table
-- Description: Add notifications system for users to receive updates about important events

-- Drop existing objects if they exist (in correct order)
DROP TRIGGER IF EXISTS trigger_update_notificacoes_updated_at ON public.notificacoes;
DROP FUNCTION IF EXISTS public.update_notificacoes_updated_at();
DROP TABLE IF EXISTS public.notificacoes CASCADE;

-- Create notifications table
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escola_id UUID REFERENCES public.escolas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('aluno_novo', 'nota_lancada', 'relatorio_gerado', 'sistema')),
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT,
  link VARCHAR(255),
  lida BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX idx_notificacoes_escola_id ON public.notificacoes(escola_id);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX idx_notificacoes_created_at ON public.notificacoes(created_at DESC);

-- Create function to update updated_at timestamp
CREATE FUNCTION public.update_notificacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_update_notificacoes_updated_at
  BEFORE UPDATE ON public.notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notificacoes_updated_at();

-- Enable RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own notifications"
  ON public.notificacoes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notificacoes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON public.notificacoes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications"
  ON public.notificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add table comment
COMMENT ON TABLE public.notificacoes IS 'Stores user notifications for important system events';
