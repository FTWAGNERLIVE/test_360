const fs = require('fs');
const p = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(p, 'utf8');

d = d.replace(
  /const canEditCharts = [^\n]+/,
  "const canEditCharts = (effectiveUser && effectiveUser.plan !== 'free') || (effectiveUser && effectiveUser.trialEndDate && getTrialDaysRemaining(new Date(effectiveUser.trialEndDate)) > 0);"
);

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
                      <button onClick={() => setEditingChart(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#ff9800', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Pronto</button>
                    </div>
                  </div>
                </div>
              )}
    </div>
  )
}

export default Dashboard;
`;

// Remove what's left from the end of file (everything after the closing )
d = d.replace(/\)\s*\}\s*$/, '');

// Add the modal + closing
d = d + modalJSX;

fs.writeFileSync(p, d, 'utf8');
console.log('done');
