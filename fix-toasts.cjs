const fs = require('fs');

const hooksFiles = [
    'src/pages/gado/GadoAnimais.tsx',
    'src/pages/gado/GadoAnimalFicha.tsx',
    'src/pages/gado/GadoConfiguracoes.tsx',
    'src/pages/gado/GadoMovimentacoes.tsx',
    'src/pages/gado/GadoPastos.tsx',
    'src/pages/gado/GadoPesagens.tsx',
    'src/pages/gado/GadoRacas.tsx',
    'src/pages/gado/GadoReproducao.tsx',
    'src/pages/gado/GadoSanidade.tsx',
    'src/pages/lavoura/LavouraConfiguracoes.tsx',
    'src/pages/lavoura/Culturas.tsx',
    'src/pages/lavoura/Comercializacao.tsx',
    'src/pages/lavoura/Pragas.tsx',
    'src/pages/lavoura/Colheitas.tsx',
    'src/pages/lavoura/Maquinas.tsx',
    'src/pages/lavoura/Insumos.tsx',
    'src/pages/lavoura/CadernoCampo.tsx',
    'src/pages/lavoura/Safras.tsx',
    'src/pages/lavoura/Talhoes.tsx',
];

// Files that use `import { useToast } from '@/components/ui/use-toast'`
const uiFiles = [
    'src/pages/secador/Cadastro.tsx',
    'src/pages/secador/SecadorConfiguracoes.tsx',
    'src/pages/secador/Quebra.tsx',
    'src/pages/secador/Expedicao.tsx',
    'src/pages/secador/SaidaGeral.tsx',
    'src/pages/secador/SaidaVenda.tsx',
    'src/pages/secador/Recebimento.tsx',
];

// Files that use `import { toast } from '@/hooks/use-toast'` (no hook call)
const directFiles = [
    'src/pages/financeiro/FinanceiroConfiguracoes.tsx',
    'src/pages/financeiro/Contatos.tsx',
    'src/pages/financeiro/CentrosCusto.tsx',
    'src/pages/financeiro/Categorias.tsx',
    'src/pages/financeiro/ContasBancarias.tsx',
    'src/pages/financeiro/Lancamentos.tsx',
    'src/pages/financeiro/ContasPagar.tsx',
    'src/pages/financeiro/ContasReceber.tsx',
];

function convertToasts(c) {
    // Remove any remaining variant:'success' as Parameters cast (with description)
    c = c.replace(/toast\(\{\s*title:\s*(`[^`]*`|'[^']*'|"[^"]*"|[^,}]+),\s*description:\s*(`[^`]*`|'[^']*'|"[^"]*"|[^,}]+),\s*variant:\s*'success'\s*\}\s*as\s*Parameters<typeof toast>\[0\]\)/g,
        (m, t, d) => `toast.success(${t.trim()}, { description: ${d.trim()} })`);
    // variant success without description as Parameters cast
    c = c.replace(/toast\(\{\s*title:\s*(`[^`]*`|'[^']*'|"[^"]*"|[^,}]+),\s*variant:\s*'success'\s*\}\s*as\s*Parameters<typeof toast>\[0\]\)/g,
        (m, t) => `toast.success(${t.trim()})`);
    // destructive with description (single line)
    c = c.replace(/toast\(\{\s*title:\s*('(?:[^'\\]|\\.)*'),\s*description:\s*('(?:[^'\\]|\\.)*'),\s*variant:\s*'destructive'\s*\}\)/g,
        (m, t, d) => `toast.error(${t}, { description: ${d} })`);
    // destructive with description expression (single line, e.g. error.message)
    c = c.replace(/toast\(\{\s*title:\s*('(?:[^'\\]|\\.)*'),\s*description:\s*([^,}'"]+),\s*variant:\s*'destructive'\s*\}\)/g,
        (m, t, d) => `toast.error(${t}, { description: ${d.trim()} })`);
    // destructive without description (single line)
    c = c.replace(/toast\(\{\s*title:\s*('(?:[^'\\]|\\.)*'),\s*variant:\s*'destructive'\s*\}\)/g,
        (m, t) => `toast.error(${t})`);
    // success with description string (single line)
    c = c.replace(/toast\(\{\s*title:\s*('(?:[^'\\]|\\.)*'),\s*description:\s*('(?:[^'\\]|\\.)*')\s*\}\)/g,
        (m, t, d) => `toast.success(${t}, { description: ${d} })`);
    // success with description expression (single line)
    c = c.replace(/toast\(\{\s*title:\s*('(?:[^'\\]|\\.)*'),\s*description:\s*([^,}'"]+)\s*\}\)/g,
        (m, t, d) => `toast.success(${t}, { description: ${d.trim()} })`);
    // success without description (single line)
    c = c.replace(/toast\(\{\s*title:\s*('(?:[^'\\]|\\.)*')\s*\}\)/g,
        (m, t) => `toast.success(${t})`);
    // success without description (backtick title)
    c = c.replace(/toast\(\{\s*title:\s*(`[^`]*`)\s*\}\)/g,
        (m, t) => `toast.success(${t})`);
    // success with backtick title and description
    c = c.replace(/toast\(\{\s*title:\s*(`[^`]*`),\s*description:\s*('(?:[^'\\]|\\.)*')\s*\}\)/g,
        (m, t, d) => `toast.success(${t}, { description: ${d} })`);

    // Also handle multi-line toast calls: toast({ title: '...', description: '...', variant: 'destructive', })
    // This handles cases like the ones in Lancamentos, ContasPagar etc where they are single-line already

    return c;
}

function processHooksFile(fpath) {
    let c = fs.readFileSync(fpath, 'utf8');
    c = c.replace("import { useToast } from '@/hooks/use-toast'", "import { toast } from 'sonner'");
    c = c.replace(/  const \{ toast \} = useToast\(\)\n/g, '');
    c = convertToasts(c);
    fs.writeFileSync(fpath, c, 'utf8');
    console.log('Done:', fpath);
}

function processUiFile(fpath) {
    let c = fs.readFileSync(fpath, 'utf8');
    c = c.replace("import { useToast } from '@/components/ui/use-toast'", "import { toast } from 'sonner'");
    c = c.replace("import { toast } from '@/components/ui/use-toast'", "import { toast } from 'sonner'");
    c = c.replace(/  const \{ toast \} = useToast\(\)\n/g, '');
    c = convertToasts(c);
    fs.writeFileSync(fpath, c, 'utf8');
    console.log('Done:', fpath);
}

function processDirectFile(fpath) {
    let c = fs.readFileSync(fpath, 'utf8');
    c = c.replace("import { toast } from '@/hooks/use-toast'", "import { toast } from 'sonner'");
    c = convertToasts(c);
    fs.writeFileSync(fpath, c, 'utf8');
    console.log('Done:', fpath);
}

for (const f of hooksFiles) processHooksFile(f);
for (const f of uiFiles) processUiFile(f);
for (const f of directFiles) processDirectFile(f);
console.log('All done!');
