// Configuracoes da API e dos intervalos
const API_URL = "https://wbtuhibegvmlhofnxxyv.supabase.co/functions/v1/leituras";
const INTERVALO = 5000;
const LIMITE_DESATUALIZACAO = 60000;

// Limites operacionais do Data Center
const TEMP_MIN = 18;
const TEMP_MAX = 27;
const UMID_MIN = 40;
const UMID_MAX = 60;

let ultimaLeitura = null;
let historico = [];
let erroConexao = false;

// Formatacao dos dados
function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo"
    });
}

function formatarValor(valor) {
    return Number(valor).toFixed(1).replace(".", ",");
}

function atualizarBadge(id, texto, classe) {
    const elemento = document.getElementById(id);
    elemento.textContent = texto;
    elemento.className = "badge " + classe;
}

// Classificacao individual das grandezas
function classificarGrandeza(valor, minimo, maximo) {
    if (valor < minimo) {
        return "baixo";
    }

    if (valor > maximo) {
        return "alto";
    }

    return "normal";
}

// Classificacao operacional
function classificarLeitura(leitura) {
    const temperatura = classificarGrandeza(
        leitura.temperatura,
        TEMP_MIN,
        TEMP_MAX
    );

    const umidade = classificarGrandeza(
        leitura.umidade,
        UMID_MIN,
        UMID_MAX
    );

    const alertaTemp = temperatura !== "normal";
    const alertaUmid = umidade !== "normal";

    let status = "NORMAL";
    let classe = "normal";

    if (alertaTemp && alertaUmid) {
        status = "CRÍTICO";
        classe = "critico";
    } else if (alertaTemp || alertaUmid) {
        status = "ATENÇÃO";
        classe = "atencao";
    }

    return {
        temperatura,
        umidade,
        status,
        classe
    };
}

// Indicadores individuais
function atualizarGrandeza(id, condicao) {
    if (condicao === "baixo") {
        atualizarBadge(id, "ABAIXO DO LIMITE", "atencao");
    } else if (condicao === "alto") {
        atualizarBadge(id, "ACIMA DO LIMITE", "atencao");
    } else {
        atualizarBadge(id, "NORMAL", "normal");
    }
}

// Verificacao da idade da ultima leitura
function dadosDesatualizados() {
    if (!ultimaLeitura) {
        return false;
    }

    const horario = new Date(
        ultimaLeitura.criado_em
    ).getTime();

    return Date.now() - horario > LIMITE_DESATUALIZACAO;
}

// Recomendacoes operacionais
function atualizarRecomendacoes() {
    const lista = document.getElementById("recomendacoes");
    lista.replaceChildren();

    function adicionar(texto, classe) {
        const item = document.createElement("li");
        item.textContent = texto;
        item.className = classe;
        lista.appendChild(item);
    }

    if (erroConexao) {
        adicionar(
            "Falha na consulta. Verifique a conexão com a API.",
            "atencao"
        );
        return;
    }

    if (!ultimaLeitura) {
        adicionar(
            "Aguardando medições do dispositivo.",
            "neutro"
        );
        return;
    }

    if (dadosDesatualizados()) {
        adicionar(
            "Dados desatualizados. Verifique a conectividade do ESP32 antes de tomar decisões.",
            "atencao"
        );
        return;
    }

    const condicao = classificarLeitura(ultimaLeitura);

    if (condicao.classe === "normal") {
        adicionar(
            "Temperatura e umidade dentro das faixas operacionais. Nenhuma intervenção necessária.",
            "normal"
        );
        return;
    }

    if (condicao.classe === "critico") {
        adicionar(
            "As duas grandezas estão fora dos limites. Priorize a verificação das condições ambientais.",
            "critico"
        );
    }

    if (condicao.temperatura === "baixo") {
        adicionar(
            "Temperatura baixa: verifique a refrigeração excessiva e o consumo de energia.",
            "atencao"
        );
    }

    if (condicao.temperatura === "alto") {
        adicionar(
            "Temperatura alta: verifique o sistema de refrigeração e a circulação de ar.",
            "atencao"
        );
    }

    if (condicao.umidade === "baixo") {
        adicionar(
            "Umidade baixa: verifique a umidificação e a proteção contra descargas eletrostáticas.",
            "atencao"
        );
    }

    if (condicao.umidade === "alto") {
        adicionar(
            "Umidade alta: verifique a desumidificação e o possível risco de condensação.",
            "atencao"
        );
    }
}

// Status da transmissao
function verificarConexao() {
    if (erroConexao) {
        atualizarBadge(
            "conexao",
            "Falha na consulta",
            "offline"
        );

    } else if (!ultimaLeitura) {
        atualizarBadge(
            "conexao",
            "Aguardando dados",
            "neutro"
        );

    } else if (dadosDesatualizados()) {
        atualizarBadge(
            "conexao",
            "Dados desatualizados",
            "desatualizado"
        );

    } else {
        atualizarBadge(
            "conexao",
            "Transmissão ativa",
            "online"
        );
    }

    atualizarRecomendacoes();
}

// Atualizacao dos valores atuais
function atualizarPainel(leitura) {
    if (!leitura) {
        return;
    }

    document.getElementById("dispositivo").textContent =
        leitura.dispositivo;

    document.getElementById("temperatura").textContent =
        formatarValor(leitura.temperatura);

    document.getElementById("umidade").textContent =
        formatarValor(leitura.umidade);

    document.getElementById("atualizacao").textContent =
        formatarData(leitura.criado_em);

    const condicao = classificarLeitura(leitura);

    atualizarGrandeza(
        "status-temperatura",
        condicao.temperatura
    );

    atualizarGrandeza(
        "status-umidade",
        condicao.umidade
    );

    atualizarBadge(
        "alerta",
        condicao.status,
        condicao.classe
    );

    const mensagens = {
        normal: "Temperatura e umidade dentro dos limites.",
        atencao: "Uma das grandezas está fora da faixa operacional.",
        critico: "Temperatura e umidade fora das faixas operacionais."
    };

    document.getElementById("mensagem-alerta").textContent =
        mensagens[condicao.classe];

    verificarConexao();
}

// Estatisticas das ultimas 100 medicoes
function atualizarEstatisticas(dados) {
    const ids = [
        "temp-min",
        "temp-max",
        "umid-min",
        "umid-max"
    ];

    if (dados.length === 0) {
        ids.forEach(id => {
            document.getElementById(id).textContent = "--";
        });
        return;
    }

    const temperaturas = dados.map(
        leitura => Number(leitura.temperatura)
    );

    const umidades = dados.map(
        leitura => Number(leitura.umidade)
    );

    document.getElementById("temp-min").textContent =
        formatarValor(Math.min(...temperaturas));

    document.getElementById("temp-max").textContent =
        formatarValor(Math.max(...temperaturas));

    document.getElementById("umid-min").textContent =
        formatarValor(Math.min(...umidades));

    document.getElementById("umid-max").textContent =
        formatarValor(Math.max(...umidades));
}

// Tabela de historico
function atualizarTabela(dados) {
    const tabela = document.getElementById("historico");
    tabela.replaceChildren();

    if (dados.length === 0) {
        const linha = tabela.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = 5;
        celula.textContent = "Nenhuma leitura disponível.";
        return;
    }

    dados.slice(0, 20).forEach(leitura => {
        const linha = tabela.insertRow();

        const valores = [
            formatarData(leitura.criado_em),
            leitura.dispositivo,
            formatarValor(leitura.temperatura) + " °C",
            formatarValor(leitura.umidade) + " %"
        ];

        valores.forEach(valor => {
            linha.insertCell().textContent = valor;
        });

        const condicao = classificarLeitura(leitura);

        const celula = linha.insertCell();
        const indicador = document.createElement("span");

        indicador.className = "badge " + condicao.classe;
        indicador.textContent = condicao.status;

        celula.appendChild(indicador);
    });
}

// Graficos de historico
function desenharGrafico(
    id,
    dados,
    campo,
    cor,
    unidade,
    limiteMin,
    limiteMax
) {
    const canvas = document.getElementById(id);
    const ctx = canvas.getContext("2d");

    const largura = canvas.clientWidth;
    const altura = canvas.clientHeight;
    const escala = window.devicePixelRatio || 1;

    if (largura < 100) {
        return;
    }

    canvas.width = largura * escala;
    canvas.height = altura * escala;

    ctx.scale(escala, escala);
    ctx.clearRect(0, 0, largura, altura);
    ctx.font = "12px Arial";

    if (dados.length === 0) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Nenhuma leitura disponível.", 20, 30);
        return;
    }

    const registros = [...dados].reverse();

    const valores = registros.map(
        item => Number(item[campo])
    );

    const margem = {
        esquerda: 55,
        direita: 25,
        superior: 20,
        inferior: 40
    };

    const areaLargura =
        largura - margem.esquerda - margem.direita;

    const areaAltura =
        altura - margem.superior - margem.inferior;

    let minimo = Math.floor(
        Math.min(...valores, limiteMin) - 5
    );

    let maximo = Math.ceil(
        Math.max(...valores, limiteMax) + 5
    );

    if (campo === "umidade") {
        minimo = 0;
        maximo = 100;
    }

    function posicaoX(indice) {
        if (valores.length === 1) {
            return margem.esquerda + areaLargura / 2;
        }

        return margem.esquerda +
            (indice / (valores.length - 1)) * areaLargura;
    }

    function posicaoY(valor) {
        return margem.superior + areaAltura -
            ((valor - minimo) / (maximo - minimo)) *
            areaAltura;
    }

    // Destaca a faixa operacional adequada
    ctx.fillStyle = "rgba(74, 222, 128, 0.07)";

    ctx.fillRect(
        margem.esquerda,
        posicaoY(limiteMax),
        areaLargura,
        posicaoY(limiteMin) - posicaoY(limiteMax)
    );

    // Linhas e escala vertical
    for (let i = 0; i <= 5; i++) {
        const valor = minimo + (maximo - minimo) * i / 5;
        const y = posicaoY(valor);

        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(margem.esquerda, y);
        ctx.lineTo(largura - margem.direita, y);
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.fillText(valor.toFixed(0) + unidade, 5, y + 4);
    }

    // Limites operacionais
    function desenharLimite(valor, texto) {
        const y = posicaoY(valor);

        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);

        ctx.beginPath();
        ctx.moveTo(margem.esquerda, y);
        ctx.lineTo(largura - margem.direita, y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = "#f87171";

        ctx.fillText(
            texto + ": " + valor + unidade,
            margem.esquerda + 5,
            y - 7
        );
    }

    desenharLimite(limiteMin, "Mínimo");
    desenharLimite(limiteMax, "Máximo");

    // Linha das medicoes
    ctx.strokeStyle = cor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    valores.forEach((valor, indice) => {
        const x = posicaoX(indice);
        const y = posicaoY(valor);

        if (indice === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Pontos fora da faixa ficam vermelhos
    valores.forEach((valor, indice) => {
        const foraDoLimite =
            valor < limiteMin || valor > limiteMax;

        ctx.beginPath();

        ctx.fillStyle = foraDoLimite
            ? "#f87171"
            : cor;

        ctx.arc(
            posicaoX(indice),
            posicaoY(valor),
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });

    // Horarios inicial e final
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "left";

    ctx.fillText(
        formatarData(registros[0].criado_em),
        margem.esquerda,
        altura - 10
    );

    if (registros.length > 1 && largura > 420) {
        ctx.textAlign = "right";

        ctx.fillText(
            formatarData(
                registros[registros.length - 1].criado_em
            ),
            largura - margem.direita,
            altura - 10
        );
    }
}

// Atualiza os graficos
function atualizarGraficos() {
    desenharGrafico(
        "grafico-temperatura",
        historico,
        "temperatura",
        "#38bdf8",
        "°C",
        TEMP_MIN,
        TEMP_MAX
    );

    desenharGrafico(
        "grafico-umidade",
        historico,
        "umidade",
        "#4ade80",
        "%",
        UMID_MIN,
        UMID_MAX
    );
}

// Consulta a API REST
async function consultarAPI(tipo) {
    const resposta = await fetch(
        API_URL + "?tipo=" + tipo,
        {
            cache: "no-store",
            signal: AbortSignal.timeout(10000)
        }
    );

    if (!resposta.ok) {
        throw new Error(
            "Erro HTTP: " + resposta.status
        );
    }

    return resposta.json();
}

// Atualizacao automatica
async function atualizarDados() {
    try {
        const dados = await Promise.all([
            consultarAPI("atual"),
            consultarAPI("historico")
        ]);

        ultimaLeitura = dados[0];
        historico = dados[1];

        erroConexao = false;

        document.getElementById(
            "mensagem-erro"
        ).textContent = "";

        atualizarPainel(ultimaLeitura);
        atualizarEstatisticas(historico);
        atualizarTabela(historico);
        atualizarGraficos();
        verificarConexao();

    } catch (erro) {
        console.error(erro);

        erroConexao = true;

        document.getElementById(
            "mensagem-erro"
        ).textContent =
            "Não foi possível consultar a API. Nova tentativa automática.";

        verificarConexao();

    } finally {
        setTimeout(atualizarDados, INTERVALO);
    }
}

// Monitoramento continuo da transmissao
setInterval(verificarConexao, 1000);

// Responsividade dos graficos
window.addEventListener(
    "resize",
    atualizarGraficos
);

// Inicia o monitoramento
atualizarDados();
