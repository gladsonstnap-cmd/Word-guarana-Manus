import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface PedidoRelatorio {
  id: number;
  cliente: string;
  sabor: string;
  tamanho: string;
  quantidade: number;
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

export function gerarPDFRelatorio(dados: DadosRelatorio) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cabeçalho
  doc.setFontSize(20);
  doc.setTextColor(45, 80, 22); // Verde Guaraná
  doc.text("🥤 World Guaraná", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Relatório de Vendas do Dia", pageWidth / 2, 25, { align: "center" });

  // Data
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dataFormatada = new Date(dados.data).toLocaleDateString("pt-BR");
  doc.text(`Data: ${dataFormatada}`, 15, 35);

  // Resumo
  doc.setFontSize(11);
  doc.setTextColor(45, 80, 22);
  doc.text("RESUMO DO DIA", 15, 45);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const resumoData = [
    ["Total de Pedidos", `${dados.totalPedidos}`],
    ["Pedidos Entregues", `${dados.pedidosEntregues}`],
    ["Faturamento Total", `R$ ${dados.faturamentoTotal.toFixed(2)}`],
  ];

  (doc as any).autoTable({
    startY: 50,
    head: [["Métrica", "Valor"]],
    body: resumoData,
    theme: "grid",
    headStyles: {
      fillColor: [45, 80, 22],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    margin: { left: 15, right: 15 },
  });

  // Tabela de Pedidos
  const currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setTextColor(45, 80, 22);
  doc.text("DETALHES DOS PEDIDOS", 15, currentY);

  const pedidosData = dados.pedidos.map(p => [
    `#${p.id}`,
    p.cliente,
    p.sabor,
    `${p.tamanho}ml`,
    `${p.quantidade ?? 1}`,
    p.itens || "-",
    p.status,
    `R$ ${p.valor.toFixed(2)}`,
  ]);

  (doc as any).autoTable({
    startY: currentY + 5,
    head: [["ID", "Cliente", "Sabor", "Tamanho", "Qtd.", "Complementos", "Status", "Valor"]],
    body: pedidosData,
    theme: "striped",
    headStyles: {
      fillColor: [45, 80, 22],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { halign: "center", cellWidth: 18 },
      4: { cellWidth: 30 },
      5: { halign: "center", cellWidth: 20 },
      6: { halign: "right", cellWidth: 20 },
    },
  });

  // Rodapé
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("Relatório gerado pelo sistema World Guaraná", pageWidth / 2, pageHeight - 10, { align: "center" });

  // Salvar PDF
  doc.save(`relatorio-${dados.data}.pdf`);
}
