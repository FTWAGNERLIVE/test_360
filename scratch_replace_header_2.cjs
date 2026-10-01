const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

const headerStart = /\{\/\* CABEÇALHO DA DASHBOARD \*\/\}/;
const headerEnd = /<\/header>\n\s*\)\}/;

const startMatch = content.match(headerStart);
const endMatch = content.match(headerEnd);

if (startMatch && endMatch) {
  const startIndex = startMatch.index;
  // find the length of the matched string to add to index
  const endIndex = endMatch.index + endMatch[0].length;

  const replacement = `{/* CABEÇALHO DA DASHBOARD */}
        <DashboardHeader 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isSharedView={isSharedView}
          setShowShareModal={setShowShareModal}
          effectiveUser={effectiveUser}
          isImpersonating={isImpersonating}
        />`;

  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(p, content, 'utf8');
  console.log('Replaced Header with DashboardHeader component');
} else {
  console.log('Header block not found. endMatch:', !!endMatch, 'startMatch:', !!startMatch);
}
