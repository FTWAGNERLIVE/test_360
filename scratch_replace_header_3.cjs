const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(p, 'utf8');

// Import DashboardHeader
const importHeader = `import DashboardHeader from '../components/DashboardHeader';\n`;
if (!content.includes('DashboardHeader')) {
  content = content.replace(/import DashboardSidebar from '\.\.\/components\/DashboardSidebar';/, `import DashboardSidebar from '../components/DashboardSidebar';\n${importHeader}`);
}

// Remove showProfileDropdown state
content = content.replace(/const \[showProfileDropdown, setShowProfileDropdown\] = useState\(false\)\n/g, '');

// Remove unused icons from import
const unusedIcons = ['Home', 'Table', 'DollarSign', 'Menu', 'LayoutDashboard', 'LogOut', 'Sparkles'];
unusedIcons.forEach(icon => {
  const regex = new RegExp(`\\b${icon}\\b\\s*,?\\s*`, 'g');
  content = content.replace(regex, '');
});
// Clean up any empty or trailing commas in the lucide-react import
content = content.replace(/,\s*\}/g, ' }');
content = content.replace(/\{\s*,/g, '{ ');

// Replace header section
const headerStart = /\{\/\* CABEÇALHO DA DASHBOARD \*\/\}/;
const headerEnd = /<\/header>\n\s*\)\}/;

const startMatch = content.match(headerStart);
const endMatch = content.match(headerEnd);

if (startMatch && endMatch) {
  const startIndex = startMatch.index;
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
