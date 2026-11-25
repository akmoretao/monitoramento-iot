-- Atualiza os alertas conforme os limites do Data Center
UPDATE public.leituras
SET alerta = (
    temperatura < 18 OR
    temperatura > 27 OR
    umidade < 40 OR
    umidade > 60
);
