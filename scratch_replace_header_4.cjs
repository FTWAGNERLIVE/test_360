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
content = content.replace(/const \[showProfileDropdown, setShowProfileDropdown\] = useState\(false\);?\r?\n/g, '');

// Remove unused icons from import
const unusedIcons = ['Home', 'Table', 'DollarSign', 'Menu', 'LayoutDashboard', 'LogOut', 'Sparkles'];
unusedIcons.forEach(icon => {
  const regex = new RegExp(`\\b${icon}\\b\\s*,?\\s*`, 'g');
  content = content.replace(regex, '');
});
content = content.replace(/,\s*\}/g, ' }');
content = content.replace(/\{\s*,/g, '{ ');

// Replace header section
const startText = '{/* CABEÇALHO DA DASHBOARD */}';
const endText = '</header>';

const startIndex = content.indexOf(startText);
let endIndex = content.indexOf(endText, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  // Find the closing )}
  const closingIndex = content.indexOf(')}', endIndex);
  if (closingIndex !== -1) {
    const replacement = `{/* CABEÇALHO DA DASHBOARD */}
        <DashboardHeader 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isSharedView={isSharedView}
          setShowShareModal={setShowShareModal}
          effectiveUser={effectiveUser}
          isImpersonating={isImpersonating}
        />`;

    content = content.substring(0, startIndex) + replacement + content.substring(closingIndex + 2);
    fs.writeFileSync(p, content, 'utf8');
    console.log('Replaced Header with DashboardHeader component');
  } else {
    console.log('Closing )} not found');
  }
} else {
  console.log('Header block not found. start:', startIndex, 'end:', endIndex);
}
