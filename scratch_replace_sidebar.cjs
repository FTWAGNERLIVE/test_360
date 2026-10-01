const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

const importSidebar = `import DashboardSidebar from '../components/DashboardSidebar';\n`;
if (!content.includes('DashboardSidebar')) {
  content = content.replace(/import '\.\/Dashboard\.css'/, `import './Dashboard.css'\n${importSidebar}`);
}

const sidebarStart = /<aside className=\{`dashboard-sidebar \$\{isSidebarOpen \? 'open' : ''\}`\}>/;
const sidebarEnd = /<\/aside>/;

const startMatch = content.match(sidebarStart);
const endMatch = content.match(sidebarEnd);

if (startMatch && endMatch) {
  const startIndex = startMatch.index;
  const endIndex = endMatch.index + '</aside>'.length;

  const replacement = `<DashboardSidebar
          isSidebarOpen={isSidebarOpen}
          effectiveUser={effectiveUser}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          setIsAddingNew={setIsAddingNew}
        />`;

  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(p, content, 'utf8');
  console.log('Replaced Sidebar with DashboardSidebar component');
} else {
  console.log('Sidebar not found');
}
