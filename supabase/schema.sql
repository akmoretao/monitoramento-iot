-- Criação da tabela de leituras do sensor
CREATE TABLE public.leituras (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dispositivo TEXT NOT NULL,
    temperatura REAL NOT NULL CHECK (temperatura BETWEEN -40 AND 80),
    umidade REAL NOT NULL CHECK (umidade BETWEEN 0 AND 100),
    alerta BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para otimizar consultas ao histórico
CREATE INDEX idx_leituras_criado_em
ON public.leituras (criado_em DESC);

-- Segurança da tabela
ALTER TABLE public.leituras ENABLE ROW LEVEL SECURITY;

-- Restringir o acesso direto à tabela
REVOKE ALL ON public.leituras FROM anon, authenticated;

-- Permitir leitura e inserção pela API do servidor
GRANT SELECT, INSERT ON public.leituras TO service_role;
