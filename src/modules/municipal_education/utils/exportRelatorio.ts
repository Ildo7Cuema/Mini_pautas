/**
 * Municipal Reports Export Utility
 * Provides PDF and CSV export functionality for municipal reports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type TipoRelatorio = 'escolas' | 'aprovacao' | 'funcionarios' | 'solicitacoes';

/**
 * Export Schools Report to PDF
 */
function exportEscolasPDF(relatorio: any): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(relatorio.titulo, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Município: ${relatorio.municipio}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Gerado em: ${new Date(relatorio.data_geracao).toLocaleDateString('pt-AO')}`, pageWidth / 2, 34, { align: 'center' });

    // Summary
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo:', 14, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const resumoText = [
        `Total: ${relatorio.resumo.total}`,
        `Activas: ${relatorio.resumo.activas}`,
        `Suspensas: ${relatorio.resumo.suspensas}`,
        `Bloqueadas: ${relatorio.resumo.bloqueadas}`,
        `Total Alunos: ${relatorio.resumo.total_alunos || 0}`,
        `Masculino: ${relatorio.resumo.total_masculino || 0}`,
        `Feminino: ${relatorio.resumo.total_feminino || 0}`
    ].join('  |  ');
    doc.text(resumoText, 14, 52);

    // Table
    autoTable(doc, {
        startY: 60,
        head: [['Escola', 'Código', 'Estado', 'Turmas', 'Total Alunos', 'Masc.', 'Fem.', 'Média']],
        body: relatorio.escolas.map((e: any) => [
            e.nome,
            e.codigo,
            e.estado,
            e.turmas,
            e.alunos,
            e.alunos_masculino || 0,
            e.alunos_feminino || 0,
            e.media ? e.media.toFixed(1) : '-'
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 18, halign: 'center' },
            6: { cellWidth: 18, halign: 'center' },
            7: { cellWidth: 18, halign: 'center' }
        }
    });

    doc.save(`relatorio_escolas_${relatorio.municipio.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export Approval Report to PDF
 */
function exportAprovacaoPDF(relatorio: any): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(relatorio.titulo, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const periodoText = relatorio.periodo?.ano_lectivo
        ? `${relatorio.periodo.ano_lectivo}${relatorio.periodo.trimestre ? ` - ${relatorio.periodo.trimestre}º Trimestre` : ''}`
        : 'Todos os períodos';
    doc.text(`Município: ${relatorio.municipio} | Período: ${periodoText}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Gerado em: ${new Date(relatorio.data_geracao).toLocaleDateString('pt-AO')}`, pageWidth / 2, 34, { align: 'center' });

    // Summary
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Municipal:', 14, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const resumoText = [
        `Total Alunos: ${relatorio.totais.total_alunos}`,
        `Masculino: ${relatorio.totais.total_masculino || 0}`,
        `Feminino: ${relatorio.totais.total_feminino || 0}`,
        `Aprovados: ${relatorio.totais.total_aprovados}`,
        `Reprovados: ${relatorio.totais.total_reprovados}`,
        `Taxa Média: ${relatorio.totais.taxa_aprovacao_media}%`,
        `Média Municipal: ${relatorio.totais.media_municipal}`
    ].join('  |  ');
    doc.text(resumoText, 14, 52);

    // Table
    autoTable(doc, {
        startY: 60,
        head: [['Escola', 'Total', 'Masc.', 'Fem.', 'Aprovados', 'Reprov.', 'Taxa (%)', 'Média']],
        body: relatorio.escolas.map((e: any) => [
            e.nome,
            e.total_alunos,
            e.alunos_masculino || 0,
            e.alunos_feminino || 0,
            e.aprovados,
            e.reprovados,
            `${e.taxa_aprovacao}%`,
            e.media ? e.media.toFixed(1) : '-'
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' },
            7: { cellWidth: 18, halign: 'center' }
        }
    });

    doc.save(`relatorio_aprovacao_${relatorio.municipio.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export Staff Report to PDF
 */
function exportFuncionariosPDF(relatorio: any): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(relatorio.titulo, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Município: ${relatorio.municipio}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Gerado em: ${new Date(relatorio.data_geracao).toLocaleDateString('pt-AO')}`, pageWidth / 2, 34, { align: 'center' });

    // Summary
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo:', 14, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const resumoText = [
        `Total: ${relatorio.stats.total}`,
        `Professores: ${relatorio.stats.professores}`,
        `Secretários: ${relatorio.stats.secretarios}`,
        `Activos: ${relatorio.stats.activos}`,
        `Inactivos: ${relatorio.stats.inactivos}`
    ].join('  |  ');
    doc.text(resumoText, 14, 52);

    // Table
    autoTable(doc, {
        startY: 60,
        head: [['Escola', 'Professores', 'Secretários', 'Total']],
        body: relatorio.por_escola.map((e: any) => [
            e.escola,
            e.professores,
            e.secretarios,
            e.total
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' }
        }
    });

    doc.save(`relatorio_funcionarios_${relatorio.municipio.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export Requests Report to PDF
 */
function exportSolicitacoesPDF(relatorio: any): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(relatorio.titulo, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Município: ${relatorio.municipio}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Gerado em: ${new Date(relatorio.data_geracao).toLocaleDateString('pt-AO')}`, pageWidth / 2, 34, { align: 'center' });

    // Stats Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Estatísticas por Estado:', 14, 48);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 56;
    const stats = relatorio.stats;
    const statsList = [
        { label: 'Total', value: stats.total },
        { label: 'Pendentes', value: stats.pendentes },
        { label: 'Em Análise', value: stats.em_analise },
        { label: 'Aprovadas', value: stats.aprovadas },
        { label: 'Rejeitadas', value: stats.rejeitadas },
        { label: 'Concluídas', value: stats.concluidas }
    ];

    statsList.forEach(stat => {
        doc.text(`${stat.label}: ${stat.value}`, 14, yPos);
        yPos += 6;
    });

    // By Type Table
    if (relatorio.por_tipo && relatorio.por_tipo.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Por Tipo de Documento:', 14, yPos + 10);

        autoTable(doc, {
            startY: yPos + 16,
            head: [['Tipo', 'Quantidade']],
            body: relatorio.por_tipo.map((t: any) => [t.tipo, t.contagem]),
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [254, 252, 232] }
        });
    }

    doc.save(`relatorio_solicitacoes_${relatorio.municipio.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export any report to CSV
 */
function exportToCSV(relatorio: any, tipo: TipoRelatorio): void {
    let csvContent = '';
    let filename = '';

    const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    switch (tipo) {
        case 'escolas':
            csvContent = 'Escola,Código,Estado,Turmas,Total Alunos,Masculino,Feminino,Média\n';
            csvContent += relatorio.escolas.map((e: any) =>
                [e.nome, e.codigo, e.estado, e.turmas, e.alunos, e.alunos_masculino || 0, e.alunos_feminino || 0, e.media || ''].map(escapeCSV).join(',')
            ).join('\n');
            filename = `relatorio_escolas_${relatorio.municipio.replace(/\s/g, '_')}`;
            break;

        case 'aprovacao':
            csvContent = 'Escola,Total Alunos,Masculino,Feminino,Aprovados,Reprovados,Taxa (%),Média\n';
            csvContent += relatorio.escolas.map((e: any) =>
                [e.nome, e.total_alunos, e.alunos_masculino || 0, e.alunos_feminino || 0, e.aprovados, e.reprovados, e.taxa_aprovacao, e.media || ''].map(escapeCSV).join(',')
            ).join('\n');
            filename = `relatorio_aprovacao_${relatorio.municipio.replace(/\s/g, '_')}`;
            break;

        case 'funcionarios':
            csvContent = 'Escola,Professores,Secretários,Total\n';
            csvContent += relatorio.por_escola.map((e: any) =>
                [e.escola, e.professores, e.secretarios, e.total].map(escapeCSV).join(',')
            ).join('\n');
            filename = `relatorio_funcionarios_${relatorio.municipio.replace(/\s/g, '_')}`;
            break;

        case 'solicitacoes':
            csvContent = 'Tipo,Quantidade\n';
            csvContent += (relatorio.por_tipo || []).map((t: any) =>
                [t.tipo, t.contagem].map(escapeCSV).join(',')
            ).join('\n');
            filename = `relatorio_solicitacoes_${relatorio.municipio.replace(/\s/g, '_')}`;
            break;
    }

    // Add BOM for proper UTF-8 encoding in Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

/**
 * Main export function - exports report to specified format
 */
export function exportRelatorio(
    relatorio: any,
    tipo: TipoRelatorio,
    formato: 'pdf' | 'csv' = 'pdf'
): void {
    if (formato === 'csv') {
        exportToCSV(relatorio, tipo);
        return;
    }

    // PDF Export
    switch (tipo) {
        case 'escolas':
            exportEscolasPDF(relatorio);
            break;
        case 'aprovacao':
            exportAprovacaoPDF(relatorio);
            break;
        case 'funcionarios':
            exportFuncionariosPDF(relatorio);
            break;
        case 'solicitacoes':
            exportSolicitacoesPDF(relatorio);
            break;
    }
}

export default exportRelatorio;
