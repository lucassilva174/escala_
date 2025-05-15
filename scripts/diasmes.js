// Função para obter apenas os dias válidos do mês atual
function obterDiasValidos(mes, ano) {
  const diasValidos = [];
  const eventosExtras = obterEventosExtras(); // Função que busca eventos cadastrados

  const diasNoMes = new Date(ano, mes, 0).getDate();
  for (let dia = 1; dia <= diasNoMes; dia++) {
    let dataAtual = new Date(ano, mes - 1, dia);
    let diaSemana = dataAtual.getDay();

    // Verifica se é terça (2), sábado (6) ou domingo (0)
    if (diaSemana === 2 || diaSemana === 6 || diaSemana === 0) {
      diasValidos.push({
        data: dia,
        diaSemana: [
          "Domingo",
          "Segunda",
          "Terça",
          "Quarta",
          "Quinta",
          "Sexta",
          "Sábado",
        ][diaSemana],
      });
    }
  }

  // Adiciona eventos extras
  eventosExtras.forEach((evento) => diasValidos.push(evento));

  return diasValidos;
}

// Função fictícia que simula a busca dos eventos extras
function obterEventosExtras() {
  return [
    { data: 10, diaSemana: "Quarta" },
    { data: 25, diaSemana: "Sexta" },
  ];
}

// Exemplo de uso para o mês atual
const hoje = new Date();
const mes = hoje.getMonth() + 1;
const ano = hoje.getFullYear();
const diasDisponiveis = obterDiasValidos(mes, ano);
console.log(diasDisponiveis);
