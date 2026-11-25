// Configuracoes do sistema
const API_URL = "https://wbtuhibegvmlhofnxxyv.supabase.co/functions/v1/leituras";
const INTERVALO = 5000;
const LIMITE_DESATUALIZACAO = 60000;

let ultimaLeitura = null;
let historico = [];
let erroConexao = false;

// Formata o horario para o horario de Brasilia
function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo"
    });
}

// Formata os valores numericos
function formatarValor(valor) {
    return Number(valor).toFixed(1).replace(".", ",");
}

// Atualiza os indicadores de status
function atualizarBadge(id, texto, classe) {
    const elemento = document.getElementById(id);
    elemento.textContent = texto;
    elemento.className = "badge " + classe;
}

// Verifica se as leituras estao desatualizadas
function verificarConexao() {
    if (erroConexao) {
        atualizarBadge("conexao", "Falha na consulta", "offline");
        return;
    }

    if (!ultimaLeitura) {
        atualizarBadge("conexao", "Aguardando dados", "neutro");
        return;
    }

    const horario = new Date(ultimaLeitura.criado_em).getTime();
    const diferenca = Date.now() - horario;

    if (diferenca > LIMITE_DESATUALIZACAO) {
        atualizarBadge("conexao", "Dados desatualizados", "desatualizado");
    } else {
        atualizarBadge("conexao", "Transmissao ativa", "online");
    }
}

// Atualiza os valores atuais
function atualizarPainel(leitura) {
    if (!leitura) return;

    document.getElementById("dispositivo").textContent =
        leitura.dispositivo;

    document.getElementById("temperatura").textContent =
        formatarValor(leitura.temperatura);

    document.getElementById("umidade").textContent =
        formatarValor(leitura.umidade);

    document.getElementById("atualizacao").textContent =
        formatarData(leitura.criado_em);

    if (leitura.alerta) {
        atualizarBadge("alerta", "ALERTA", "alerta");

        document.getElementById("mensagem-alerta").textContent =
            "Temperatura igual ou superior a 30 °C.";
    } else {
        atualizarBadge("alerta", "NORMAL", "normal");

        document.getElementById("mensagem-alerta").textContent =
            "Temperatura dentro do limite estabelecido.";
    }

    verificarConexao();
}

// Atualiza a tabela com as ultimas 20 leituras
function atualizarTabela(dados) {
    const tabela = document.getElementById("historico");
    tabela.replaceChildren();

    if (dados.length === 0) {
        const linha = tabela.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = 5;
        celula.textContent = "Nenhuma leitura disponivel.";
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

        const celula = linha.insertCell();
        const indicador = document.createElement("span");

        indicador.className = leitura.alerta
            ? "badge alerta"
            : "badge normal";

        indicador.textContent = leitura.alerta
            ? "ALERTA"
            : "NORMAL";

        celula.appendChild(indicador);
    });
}

// Desenha os graficos utilizando Canvas
function desenharGrafico(id, dados, campo, cor, unidade) {
    const canvas = document.getElementById(id);
    const ctx = canvas.getContext("2d");

    const largura = canvas.clientWidth;
    const altura = canvas.clientHeight;
    const escala = window.devicePixelRatio || 1;

    canvas.width = largura * escala;
    canvas.height = altura * escala;

    ctx.scale(escala, escala);
    ctx.clearRect(0, 0, largura, altura);

    ctx.font = "12px Arial";

    if (dados.length === 0) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Nenhuma leitura disponivel.", 20, 30);
        return;
    }

    // Organiza os dados do mais antigo ao mais recente
    const registros = [...dados].reverse();

    const valores = registros.map(item => Number(item[campo]));

    const margem = {
        esquerda: 55,
        direita: 25,
        superior: 20,
        inferior: 40
    };

    const areaLargura = largura - margem.esquerda - margem.direita;
    const areaAltura = altura - margem.superior - margem.inferior;

    let minimo = Math.floor(Math.min(...valores) - 5);
    let maximo = Math.ceil(Math.max(...valores) + 5);

    if (campo === "umidade") {
        minimo = 0;
        maximo = 100;
    }

    // Mantem o limite de alerta visivel
    if (campo === "temperatura") {
        minimo = Math.min(minimo, 25);
        maximo = Math.max(maximo, 35);
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
            ((valor - minimo) / (maximo - minimo)) * areaAltura;
    }

    // Linhas horizontais e escala
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

    // Linha de limite de temperatura
    if (campo === "temperatura") {
        const y = posicaoY(30);

        ctx.strokeStyle = "#f87171";
        ctx.setLineDash([6, 6]);

        ctx.beginPath();
        ctx.moveTo(margem.esquerda, y);
        ctx.lineTo(largura - margem.direita, y);
        ctx.stroke();

        ctx.setLineDash([]);

        ctx.fillStyle = "#f87171";
        ctx.fillText("Limite: 30 °C", margem.esquerda + 5, y - 8);
    }

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

    // Pontos das medicoes
    valores.forEach((valor, indice) => {
        ctx.beginPath();
        ctx.fillStyle = cor;

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

    const primeiro = formatarData(registros[0].criado_em);
    const ultimo = formatarData(
        registros[registros.length - 1].criado_em
    );

    ctx.textAlign = "left";
    ctx.fillText(primeiro, margem.esquerda, altura - 10);

    if (registros.length > 1 && largura > 420) {
        ctx.textAlign = "right";
        ctx.fillText(ultimo, largura - margem.direita, altura - 10);
    }
}

// Atualiza os dois graficos
function atualizarGraficos() {
    desenharGrafico(
        "grafico-temperatura",
        historico,
        "temperatura",
        "#38bdf8",
        "°C"
    );

    desenharGrafico(
        "grafico-umidade",
        historico,
        "umidade",
        "#4ade80",
        "%"
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
        throw new Error("Erro HTTP: " + resposta.status);
    }

    return resposta.json();
}

// Atualizacao automatica do painel
async function atualizarDados() {
    try {
        const dados = await Promise.all([
            consultarAPI("atual"),
            consultarAPI("historico")
        ]);

        ultimaLeitura = dados[0];
        historico = dados[1];

        erroConexao = false;

        document.getElementById("mensagem-erro").textContent = "";

        atualizarPainel(ultimaLeitura);
        atualizarTabela(historico);
        atualizarGraficos();
        verificarConexao();

    } catch (erro) {
        console.error(erro);

        erroConexao = true;

        document.getElementById("mensagem-erro").textContent =
            "Nao foi possivel consultar a API. Nova tentativa automatica.";

        verificarConexao();

    } finally {
        setTimeout(atualizarDados, INTERVALO);
    }
}

// Verifica o estado da transmissao continuamente
setInterval(verificarConexao, 1000);

// Redimensiona os graficos quando necessario
window.addEventListener("resize", atualizarGraficos);

// Inicia o monitoramento
atualizarDados();
