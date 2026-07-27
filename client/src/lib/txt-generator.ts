interface PedidoRelatorio {
  id: number;
  cliente: string;
  sabor: string;
  tamanho: string;
  quantidade: number;
  formaPagamento: "dinheiro" | "pix" | "cartao";
  valor: number;
  status: string;
  itens: string;
}

interface DadosRelatorio {
  data: string;
  totalPedidos: number;
  pedidosEntregues: number;
  faturamentoTotal: number;
  pedidos: PedidoRelatorio[];
}

export function gerarTXTRelatorio(dados: DadosRelatorio) {
  const dataFormatada = new Date(dados.data).toLocaleDateString("pt-BR");
  
  let conteudo = "";
  conteudo += "╔════════════════════════════════════════════════════════════════╗\n";
  conteudo += "║                     🥤 WORLD GUARANÁ 🥤                        ║\n";
  conteudo += "║                   RELATÓRIO DE VENDAS DO DIA                   ║\n";
  conteudo += "╚════════════════════════════════════════════════════════════════╝\n\n";
  
  conteudo += `Data: ${dataFormatada}\n`;
  conteudo += "═".repeat(66) + "\n\n";
  
  conteudo += "RESUMO DO DIA\n";
  conteudo += "─".repeat(66) + "\n";
  conteudo += `Total de Pedidos:        ${dados.totalPedidos}\n`;
  conteudo += `Pedidos Entregues:       ${dados.pedidosEntregues}\n`;
  conteudo += `Faturamento Total:       R$ ${dados.faturamentoTotal.toFixed(2)}\n`;
  conteudo += "═".repeat(66) + "\n\n";
  
  conteudo += "DETALHES DOS PEDIDOS\n";
  conteudo += "─".repeat(66) + "\n";
  conteudo += `${"ID".padEnd(5)} | ${"Cliente".padEnd(20)} | ${"Sabor".padEnd(15)} | ${"Status".padEnd(12)} | ${"Valor".padEnd(8)}\n`;
  conteudo += "─".repeat(66) + "\n";
  
  dados.pedidos.forEach(p => {
    const pagamento = p.formaPagamento === "pix" ? "Pix" : p.formaPagamento === "cartao" ? "Cartão" : "Dinheiro";
    conteudo += `${String(p.id).padEnd(5)} | ${p.cliente.substring(0, 20).padEnd(20)} | ${p.sabor.substring(0, 15).padEnd(15)} | ${p.status.substring(0, 12).padEnd(12)} | ${p.quantidade ?? 1} copo(s) | ${pagamento} | R$ ${p.valor.toFixed(2).padEnd(6)}\n`;
  });
  
  conteudo += "═".repeat(66) + "\n\n";
  conteudo += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n`;
  conteudo += "Relatório gerado pelo sistema World Guaraná\n";
  
  // Criar blob e baixar
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio-${dados.data}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}
