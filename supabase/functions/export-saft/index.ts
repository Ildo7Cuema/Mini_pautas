import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const url = new URL(req.url)
        const month = parseInt(url.searchParams.get('month') || '0')
        const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString())

        if (!month) throw new Error('Month is required')

        // 1. Fetch Company Info (School)
        // Assuming first school found or passed by ID. 
        // Ideally pass escola_id param.
        // For now hardcode or fetch generic.
        const escolaId = url.searchParams.get('escola_id')
        let escola = { nome: 'Escola Exemplo', nif: '999999999', cidade: 'Luanda' }

        if (escolaId) {
            const { data: esc } = await supabaseClient.from('escolas_profile').select('*').eq('id', escolaId).single()
            if (esc) escola = { nome: esc.nome, nif: esc.nif || '999999999', cidade: esc.municipio || 'Luanda' }
        }

        // 2. Fetch Payments (SalesInvoices)
        const { data: payments, error } = await supabaseClient
            .from('pagamentos_propinas')
            .select(`
        *,
        aluno:alunos(id, nome_completo, numero_processo)
      `)
            .eq('mes_referencia', month)
            .eq('ano_referencia', year)
            //.eq('estado', 'valido') // SAF-T MUST INCLUDE ANNULLED DOCS TOO (Status 'A')
            .order('created_at', { ascending: true })

        if (error) throw error

        // 3. Build XML (Simplified SAF-T AO Structure)
        const auditFile = [
            `<?xml version="1.0" encoding="UTF-8"?>`,
            `<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:AO_1.01_01" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:OECD:StandardAuditFile-Tax:AO_1.01_01 SAF-T_AO.xsd">`,
            `  <Header>`,
            `    <AuditFileVersion>1.01_01</AuditFileVersion>`,
            `    <CompanyID>${escola.nif}</CompanyID>`,
            `    <TaxRegistrationNumber>${escola.nif}</TaxRegistrationNumber>`,
            `    <TaxAccountingBasis>F</TaxAccountingBasis>`,
            `    <CompanyName>${escola.nome}</CompanyName>`,
            `    <BusinessName>${escola.nome}</BusinessName>`,
            `    <CompanyAddress>`,
            `      <AddressDetail>${escola.cidade}</AddressDetail>`,
            `      <City>${escola.cidade}</City>`,
            `      <Country>AO</Country>`,
            `    </CompanyAddress>`,
            `    <FiscalYear>${year}</FiscalYear>`,
            `    <StartDate>${year}-01-01</StartDate>`,
            `    <EndDate>${year}-12-31</EndDate>`,
            `    <CurrencyCode>AOA</CurrencyCode>`,
            `    <DateCreated>${new Date().toISOString().split('T')[0]}</DateCreated>`,
            `    <TaxEntity>Global</TaxEntity>`,
            `    <ProductCompanyTaxID>${escola.nif}</ProductCompanyTaxID>`,
            `    <SoftwareValidationNumber>000/AGT/2024</SoftwareValidationNumber>`,
            `    <ProductID>EduGest/AO</ProductID>`,
            `    <ProductVersion>1.0.0</ProductVersion>`,
            `  </Header>`,
            `  <MasterFiles>`,
            `    <Customer>`,
            // Iterate Unique Customers
            ...Array.from(new Set(payments.map((p: any) => JSON.stringify(p.aluno)))).map((aStr: string) => {
                const a = JSON.parse(aStr);
                return [
                    `      <CustomerID>${a.id}</CustomerID>`,
                    `      <AccountID>Desconhecido</AccountID>`,
                    `      <CustomerTaxID>999999999</CustomerTaxID>`,
                    `      <CompanyName>${a.nome_completo}</CompanyName>`,
                    `      <BillingAddress>`,
                    `        <AddressDetail>Luanda</AddressDetail>`,
                    `        <City>Luanda</City>`,
                    `        <Country>AO</Country>`,
                    `      </BillingAddress>`,
                    `      <SelfBillingIndicator>0</SelfBillingIndicator>`,
                ].join('\n    ')
            }),
            `    </Customer>`,
            `    <Product>`,
            `      <ProductType>S</ProductType>`,
            `      <ProductCode>PROP</ProductCode>`,
            `      <ProductGroup>Servicos</ProductGroup>`,
            `      <Description>Propina Mensal</Description>`,
            `      <ProductNumberCode>PROP</ProductNumberCode>`,
            `    </Product>`,
            `    <TaxTable>`,
            `      <TaxTableEntry>`,
            `        <TaxType>IVA</TaxType>`,
            `        <TaxCountryRegion>AO</TaxCountryRegion>`,
            `        <TaxCode>ISE</TaxCode>`,
            `        <Description>Isento</Description>`,
            `        <TaxPercentage>0.00</TaxPercentage>`,
            `      </TaxTableEntry>`,
            `    </TaxTable>`,
            `  </MasterFiles>`,
            `  <SourceDocuments>`,
            `    <SalesInvoices>`,
            `      <NumberOfEntries>${payments.length}</NumberOfEntries>`,
            `      <TotalDebit>0.00</TotalDebit>`,
            `      <TotalCredit>${payments.reduce((acc: number, p: any) => acc + (p.estado === 'valido' ? p.valor : 0), 0).toFixed(2)}</TotalCredit>`,
            // Invoices
            ...payments.map((p: any) => {
                const status = p.estado === 'anulado' ? 'A' : 'N';
                const hash = p.hash || '0';
                const hashControl = p.hash_control || '0';

                return [
                    `      <Invoice>`,
                    `        <InvoiceNo>${p.numero_recibo}</InvoiceNo>`,
                    `        <DocumentStatus>`,
                    `          <InvoiceStatus>${status}</InvoiceStatus>`,
                    `          <InvoiceStatusDate>${new Date(p.created_at).toISOString()}</InvoiceStatusDate>`,
                    `          <SourceID>Admin</SourceID>`,
                    `          <SourceBilling>P</SourceBilling>`,
                    `        </DocumentStatus>`,
                    `        <Hash>${hash}</Hash>`,
                    `        <HashControl>${hashControl}</HashControl>`,
                    `        <Period>${month}</Period>`,
                    `        <InvoiceDate>${new Date(p.data_pagamento).toISOString().split('T')[0]}</InvoiceDate>`,
                    `        <InvoiceType>FT</InvoiceType>`, // Should be FT, FR, or VD
                    `        <SpecialRegimes>`,
                    `          <SelfBillingIndicator>0</SelfBillingIndicator>`,
                    `          <CashVATSchemeIndicator>0</CashVATSchemeIndicator>`,
                    `          <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>`,
                    `        </SpecialRegimes>`,
                    `        <SourceID>Admin</SourceID>`,
                    `        <SystemEntryDate>${new Date(p.created_at).toISOString()}</SystemEntryDate>`,
                    `        <CustomerID>${p.aluno.id}</CustomerID>`,
                    `        <Line>`,
                    `          <LineNumber>1</LineNumber>`,
                    `          <ProductCode>PROP</ProductCode>`,
                    `          <ProductDescription>Propina ${p.mes_referencia}/${p.ano_referencia}</ProductDescription>`,
                    `          <Quantity>1</Quantity>`,
                    `          <UnitOfMeasure>Unid</UnitOfMeasure>`,
                    `          <UnitPrice>${p.valor.toFixed(2)}</UnitPrice>`,
                    `          <TaxPointDate>${new Date(p.data_pagamento).toISOString().split('T')[0]}</TaxPointDate>`,
                    `          <Description>Propina</Description>`,
                    `          <CreditAmount>${p.valor.toFixed(2)}</CreditAmount>`,
                    `          <Tax>`,
                    `            <TaxType>IVA</TaxType>`,
                    `            <TaxCountryRegion>AO</TaxCountryRegion>`,
                    `            <TaxCode>ISE</TaxCode>`,
                    `            <TaxPercentage>0.00</TaxPercentage>`,
                    `          </Tax>`,
                    `          <SettlementAmount>0.00</SettlementAmount>`,
                    `        </Line>`,
                    `        <DocumentTotals>`,
                    `          <TaxPayable>0.00</TaxPayable>`,
                    `          <NetTotal>${p.valor.toFixed(2)}</NetTotal>`,
                    `          <GrossTotal>${p.valor.toFixed(2)}</GrossTotal>`,
                    `        </DocumentTotals>`,
                    `      </Invoice>`
                ].join('\n')
            }),
            `    </SalesInvoices>`,
            `  </SourceDocuments>`,
            `</AuditFile>`
        ].join('\n');

        return new Response(
            auditFile,
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/xml',
                    'Content-Disposition': `attachment; filename="SAFT_AO_${month}_${year}.xml"`
                }
            }
        )

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
