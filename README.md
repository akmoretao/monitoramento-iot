# Monitoramento IoT — Temperatura e Umidade

Projeto Integrador da disciplina de Arquitetura de Computadores e IoT.

## Objetivo

Simular o monitoramento ambiental de uma sala de servidores, utilizando um ESP32 e um sensor DHT22 para coletar informações de temperatura e umidade e identificar temperaturas elevadas.

## Links do projeto

- [Repositório GitHub](https://github.com/akmoretao/monitoramento-iot)
- [Simulação no Wokwi](https://wokwi.com/projects/481619803001977857)
- [Painel web](https://monitoramento-iot.pages.dev)
- [API REST](https://wbtuhibegvmlhofnxxyv.supabase.co/functions/v1/leituras)
- Vídeo de demonstração: ...

## Arquitetura e tecnologias

O projeto utiliza a opção B do enunciado, com comunicação direta por HTTPS, sem MQTT.

O ESP32, programado em MicroPython, realiza a coleta pelo GPIO 15 e aguarda 10 segundos entre os ciclos. A API, desenvolvida em TypeScript, valida e armazena as medições no PostgreSQL. O painel, desenvolvido em HTML, CSS e JavaScript, consulta os dados automaticamente, com espera de 5 segundos entre consultas.

O alerta é acionado quando a temperatura atinge 30 °C. Após 60 segundos sem novas leituras, os dados são considerados desatualizados.

## Como reproduzir o projeto

### Supabase

1. Crie um projeto no Supabase com a Data API habilitada.
2. Execute `supabase/schema.sql` no SQL Editor de um banco novo.
3. Crie uma Edge Function chamada `leituras`, utilizando o código de `supabase/functions/leituras/index.ts`.
4. Publique a função e desative **Verify JWT with legacy secret** nas configurações.
5. Em Secrets, crie `IOT_API_KEY` com uma chave privada aleatória. Confira se `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão disponíveis no ambiente da função.
6. Copie a URL da função publicada.

A API recebe leituras por POST, com os campos `dispositivo`, `temperatura` e `umidade` em JSON e os cabeçalhos `Content-Type: application/json` e `x-api-key` (chave privada). As consultas GET são públicas: `?tipo=atual` retorna a última leitura e `?tipo=historico` retorna até 100 registros.

### Wokwi

1. Crie uma cópia da simulação indicada acima ou um projeto ESP32 com MicroPython.
2. Utilize os arquivos `wokwi/main.py` e `wokwi/diagram.json`.
3. Atualize `API_URL` em `main.py` com o endpoint da sua função.
4. Inicie a simulação e informe sua chave `IOT_API_KEY` no monitor serial.
5. Altere os valores do DHT22 e confira as leituras no Supabase.

O circuito foi adaptado do [MicroPython MQTT Weather Logger](https://wokwi.com/projects/322577683855704658), de Uri Shaked.

### Cloudflare Pages

1. Atualize `API_URL` em `frontend/script.js` com o endpoint da sua função.
2. Conecte sua cópia do repositório ao Cloudflare Pages.
3. Configure a publicação conforme abaixo:

| Configuração | Valor |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | Vazio |
| Build output directory | `frontend` |
| Root directory | Padrão |

4. Publique e acesse o painel.

Não inclua credenciais privadas no código ou no repositório.

## Testes e limitações

Foram testados com sucesso o envio e a consulta das medições, a rejeição de dados inválidos e de envios sem autorização, as condições normal e de alerta, a interrupção e retomada da transmissão e o armazenamento com o painel fechado.

O sistema depende da conexão com a internet, possui intervalo efetivo de coleta variável e não armazena localmente medições perdidas durante falhas de comunicação. Os testes foram realizados em ambiente simulado.

As evidências dos testes estão destinadas ao relatório acadêmico.

## Integrantes

- Nome: Ana Karla de Souza Moretão | RA: 1986881
- Nome: Lucas Nunes Alves da Silva | RA: 1996656
