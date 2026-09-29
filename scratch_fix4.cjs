const fs = require('fs');
const p = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(p, 'utf8');

// 1. Add Edit/Settings icon to imports
d = d.replace(
  /} from 'lucide-react'/,
  ', Settings, Lock\n} from \'lucide-react\''
);

// 2. Add manualConfig and editingChart states
const stateCode = `  const [smartDiscovery, setSmartDiscovery] = useState<any>(null)
  const [manualConfig, setManualConfig] = useState<any>({})
  const [editingChart, setEditingChart] = useState<string | null>(null)`;
d = d.replace(/const \[smartDiscovery, setSmartDiscovery\] = useState<any>\(null\)/, stateCode);

// 3. Apply manualConfig to all useMemos
d = d.replace(
  /const barCategoryHeader = useMemo\(\(\) => \{/,
  'const barCategoryHeader = useMemo(() => {\n    if (manualConfig.primaryCategory && csvHeaders.includes(manualConfig.primaryCategory)) return manualConfig.primaryCategory;'
);
d = d.replace(
  /const donutCategoryHeader = useMemo\(\(\) => \{/,
  'const donutCategoryHeader = useMemo(() => {\n    if (manualConfig.donutCategory && csvHeaders.includes(manualConfig.donutCategory)) return manualConfig.donutCategory;'
);
d = d.replace(
  /const radarCategoryHeader = useMemo\(\(\) => \{/,
  'const radarCategoryHeader = useMemo(() => {\n    if (manualConfig.radarCategory && csvHeaders.includes(manualConfig.radarCategory)) return manualConfig.radarCategory;'
);
d = d.replace(
  /const dateHeader = useMemo\(\(\) => \{/,
  'const dateHeader = useMemo(() => {\n    if (manualConfig.primaryDate && csvHeaders.includes(manualConfig.primaryDate)) return manualConfig.primaryDate;'
);
d = d.replace(
  /const series1Key = useMemo\(\(\) => \{/,
  'const series1Key = useMemo(() => {\n    if (manualConfig.primaryMetric && csvHeaders.includes(manualConfig.primaryMetric)) return manualConfig.primaryMetric;'
);
d = d.replace(
  /const series2Key = useMemo\(\(\) => \{/,
  'const series2Key = useMemo(() => {\n    if (manualConfig.secondaryMetric && csvHeaders.includes(manualConfig.secondaryMetric)) return manualConfig.secondaryMetric;'
);

// 4. Add the canEditCharts logic and handleEditClick inside Dashboard component
// We can insert this right before `const effectiveConfig = ...`
const editLogic = `
  const canEditCharts = effectiveUser?.plan !== 'free' || getTrialDaysRemaining(effectiveUser) > 0;
  
  const handleEditClick = (chartId: string) => {
    if (!canEditCharts) {
      if (window.confirm('A edição de gráficos é exclusiva para assinantes Premium ou usuários em período de teste. Deseja fazer upgrade agora?')) {
        window.location.href = '/pricing';
      }
      return;
    }
    setEditingChart(chartId);
  };

  const handleSaveManualConfig = (newConfig: any) => {
    setManualConfig({ ...manualConfig, ...newConfig });
    setEditingChart(null);
  };
`;
d = d.replace(/const effectiveDiscovery = useMemo/, editLogic + '\n  const effectiveDiscovery = useMemo');

// 5. Add icons to chart headers
d = d.replace(
  /<h3 className="widget-title">\s*\{effectiveDiscovery\?.dashboardConfig\?.chartTitles\?.barChart \|\| `Análise Comparativa por \$\{barCategoryHeader \|\| 'Categoria'\}`\}\s*<\/h3>/,
  `<h3 className="widget-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{effectiveDiscovery?.dashboardConfig?.chartTitles?.barChart || \`Análise Comparativa por \${barCategoryHeader || 'Categoria'}\`}</span>
                      <button onClick={() => handleEditClick('bar')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} title="Editar Gráfico">
                        {canEditCharts ? <Settings size={16} /> : <Lock size={16} />}
                      </button>
                    </h3>`
);

d = d.replace(
  /<h3 className="widget-title".*?>\s*\{effectiveDiscovery\?.dashboardConfig\?.chartTitles\?.donutChart \|\| `Proporção por \$\{donutCategoryHeader \|\| 'Categoria'\}`\}\s*<\/h3>/,
  `<h3 className="widget-title" style={{ fontSize: '14px', fontWeight: 700, color: '#192a3e', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{effectiveDiscovery?.dashboardConfig?.chartTitles?.donutChart || \`Proporção por \${donutCategoryHeader || 'Categoria'}\`}</span>
                      <button onClick={() => handleEditClick('donut')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} title="Editar Gráfico">
                        {canEditCharts ? <Settings size={16} /> : <Lock size={16} />}
                      </button>
                    </h3>`
);

d = d.replace(
  /<h3 className="widget-title".*?>\s*\{effectiveDiscovery\?.dashboardConfig\?.chartTitles\?.areaChart \|\| `Evolução de \$\{series1Key\}`\}\s*<\/h3>/,
  `<h3 className="widget-title" style={{ fontSize: '14px', fontWeight: 700, color: '#192a3e', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{effectiveDiscovery?.dashboardConfig?.chartTitles?.areaChart || \`Evolução de \${series1Key}\`}</span>
                      <button onClick={() => handleEditClick('area')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} title="Editar Gráfico">
                        {canEditCharts ? <Settings size={16} /> : <Lock size={16} />}
                      </button>
                    </h3>`
);

d = d.replace(
  /<h3 className="widget-title".*?>\s*\{effectiveDiscovery\?.dashboardConfig\?.chartTitles\?.radarChart \|\| `Perfil por \$\{radarCategoryHeader \|\| 'Categoria'\}`\}\s*<\/h3>/,
  `<h3 className="widget-title" style={{ fontSize: '14px', fontWeight: 700, color: '#192a3e', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{effectiveDiscovery?.dashboardConfig?.chartTitles?.radarChart || \`Perfil por \${radarCategoryHeader || 'Categoria'}\`}</span>
                      <button onClick={() => handleEditClick('radar')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} title="Editar Gráfico">
                        {canEditCharts ? <Settings size={16} /> : <Lock size={16} />}
                      </button>
                    </h3>`
);

// 6. Append the Edit Modal to the end of dashboard-widgets-wrapper
const modalJSX = `
              {editingChart && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#192a3e' }}>Editar Gráfico</h2>
                    
                    {editingChart === 'bar' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ fontSize: '14px', color: '#64748b' }}>Categoria (Eixo X)
                          <select value={manualConfig.primaryCategory || barCategoryHeader} onChange={e => setManualConfig({...manualConfig, primaryCategory: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                        <label style={{ fontSize: '14px', color: '#64748b' }}>Métrica 1 (Eixo Y)
                          <select value={manualConfig.primaryMetric || series1Key} onChange={e => setManualConfig({...manualConfig, primaryMetric: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            {numericHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                        <label style={{ fontSize: '14px', color: '#64748b' }}>Métrica 2 (Opcional)
                          <select value={manualConfig.secondaryMetric || series2Key} onChange={e => setManualConfig({...manualConfig, secondaryMetric: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <option value="">Nenhuma</option>
                            {numericHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                      </div>
                    )}

                    {editingChart === 'donut' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ fontSize: '14px', color: '#64748b' }}>Categoria do Donut
                          <select value={manualConfig.donutCategory || donutCategoryHeader} onChange={e => setManualConfig({...manualConfig, donutCategory: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                      </div>
                    )}

                    {editingChart === 'radar' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ fontSize: '14px', color: '#64748b' }}>Categoria do Radar
                          <select value={manualConfig.radarCategory || radarCategoryHeader} onChange={e => setManualConfig({...manualConfig, radarCategory: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                      </div>
                    )}

                    {editingChart === 'area' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ fontSize: '14px', color: '#64748b' }}>Data (Eixo X)
                          <select value={manualConfig.primaryDate || dateHeader} onChange={e => setManualConfig({...manualConfig, primaryDate: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                        <label style={{ fontSize: '14px', color: '#64748b' }}>Métrica (Eixo Y)
                          <select value={manualConfig.primaryMetric || series1Key} onChange={e => setManualConfig({...manualConfig, primaryMetric: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            {numericHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                      <button onClick={() => setEditingChart(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={() => setEditingChart(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#ff9800', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Aplicar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </main>`;
      
d = d.replace(/<\/div>\s*\)\s*\)\s*\}\s*<\/main>/, modalJSX);

fs.writeFileSync(p, d, 'utf8');
console.log('done');
