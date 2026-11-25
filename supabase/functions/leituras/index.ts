import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
};

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  // Permite consultas pelo frontend
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Recebimento das leituras do ESP32
    if (req.method === "POST") {
      const chave = Deno.env.get("IOT_API_KEY");

      if (!chave || req.headers.get("x-api-key") !== chave) {
        return resposta({ erro: "Acesso não autorizado" }, 401);
      }

      let dados;

      try {
        dados = await req.json();
      } catch {
        return resposta({ erro: "JSON inválido" }, 400);
      }

      if (!dados || typeof dados !== "object") {
        return resposta({ erro: "Dados inválidos" }, 400);
      }

      const { dispositivo, temperatura, umidade } = dados;

      // Validação das medições
      if (
        typeof dispositivo !== "string" ||
        !dispositivo.trim() ||
        dispositivo.length > 100 ||
        typeof temperatura !== "number" ||
        !Number.isFinite(temperatura) ||
        temperatura < -40 ||
        temperatura > 80 ||
        typeof umidade !== "number" ||
        !Number.isFinite(umidade) ||
        umidade < 0 ||
        umidade > 100
      ) {
        return resposta({ erro: "Dados inválidos" }, 400);
      }

      // Condição de alerta
      const alerta = temperatura >= 30;

      // Armazenamento no banco de dados
      const { data, error } = await supabase
        .from("leituras")
        .insert({
          dispositivo,
          temperatura,
          umidade,
          alerta,
        })
        .select()
        .single();

      if (error) throw error;

      console.log("Leitura recebida:", data);

      return resposta(data, 201);
    }

    // Consulta das leituras pelo painel
    if (req.method === "GET") {
      const url = new URL(req.url);
      const tipo = url.searchParams.get("tipo") || "atual";

      // Retorna a leitura mais recente
      if (tipo === "atual") {
        const { data, error } = await supabase
          .from("leituras")
          .select("*")
          .order("criado_em", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        return resposta(data);
      }

      // Retorna as últimas 100 leituras
      if (tipo === "historico") {
        const { data, error } = await supabase
          .from("leituras")
          .select("*")
          .order("criado_em", { ascending: false })
          .order("id", { ascending: false })
          .limit(100);

        if (error) throw error;

        return resposta(data);
      }

      return resposta({ erro: "Consulta inválida" }, 400);
    }

    return resposta({ erro: "Método não permitido" }, 405);

  } catch (error) {
    console.error(error);

    return resposta({
      erro: "Erro interno do servidor",
    }, 500);
  }
});
