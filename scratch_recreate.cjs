const fs = require('fs');
const p = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(p, 'utf8');

// Inject the handleRecreateWithAI function after handleSwitchFile
const funcToInject = `
  const handleRecreateWithAI = async () => {
    if (!activeFileId || csvData.length === 0) return;
    
    setLoadingInsights(true);
    // Removemos o setSmartDiscovery(null) aqui para não piscar os gráficos antes da hora, ou deixamos para dar feedback de loading.
    // O loadingInsights = true já vai mostrar o spinner "Processando dados..."
    try {
      const discovery = await getSmartDiscovery(csvHeaders, csvData, effectiveUser?.onboardingData);
      setSmartDiscovery(discovery);
      
      const fileRecord = userFiles.find(f => f.id === activeFileId);
      if (fileRecord) {
        await saveCSVData(
          csvData, 
          csvHeaders, 
          fileRecord.fileName, 
          activeFileId, 
          discovery, 
          effectiveUser?.id
        );
      }
    } catch (err) {
      console.error("Erro ao recriar dashboard com IA:", err);
      alert("Erro ao recriar dashboard com IA. Verifique sua conexão.");
    } finally {
      setLoadingInsights(false);
    }
  };
`;

if (!d.includes('handleRecreateWithAI')) {
  d = d.replace(
    /const handleSwitchFile = async \(\w+: string\) => \{[\s\S]*?\}\s*catch \(err\) \{[\s\S]*?\}\s*\}/,
    (match) => match + '\n' + funcToInject
  );
}

// Now inject the button in the tabs bar
// We need to find the <div className="tabs-bar-wrapper">...</div> block
// Wait, the block is:
/*
        {/* BARRA DE ABAS DE PLANILHAS (SE EXISTIREM) *\/}
        {(userFiles.length > 0 || isAddingNew) && (
          <div className="tabs-bar-wrapper">
            <div className="tabs-list">
              {userFiles.map(file => (
*/

d = d.replace(
  /<div className="tabs-bar-wrapper">/,
  '<div className="tabs-bar-wrapper" style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\' }}>'
);

const buttonToInject = `
            {/* NOVO BOTÃO DE RECRIAR COM IA */}
            {!isSharedView && activeFileId && !isAddingNew && (
              <button 
                onClick={handleRecreateWithAI}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(to right, #f59e0b, #ea580c)',
                  color: '#fff', border: 'none', padding: '6px 14px',
                  borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)',
                  whiteSpace: 'nowrap'
                }}
                title="Pedir para a IA analisar os dados e recriar os gráficos"
              >
                <Sparkles size={14} />
                Recriar com IA
              </button>
            )}
`;

// Insert the button before the closing div of tabs-bar-wrapper
// There is a </div> right after } )} of tabs-list. Let's find it using regex:
d = d.replace(
  /(\s*\{\!isSharedView && \(\s*<button className="add-tab-pill"[\s\S]*?<\/button>\s*\)\}\s*<\/div>)/,
  (match) => match + '\n' + buttonToInject
);

fs.writeFileSync(p, d, 'utf8');
console.log('done');
