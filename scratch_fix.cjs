const fs = require('fs');
const p = 'c:/Users/creat/Documents/Projeto_test360/src/pages/Dashboard.tsx';
let d = fs.readFileSync(p, 'utf8');

// 1. Update imports
d = d.replace(
  /} from 'lucide-react'/,
  ', Users, Activity, Briefcase, TrendingUp, ShoppingCart, Target, Heart, CheckCircle\n} from \'lucide-react\''
);

// 2. Add IconMap
d = d.replace(
  /const cleanNumber = /,
  'const ICON_MAP: Record<string, React.ElementType> = {\n  DollarSign, Users, Activity, Briefcase, TrendingUp, ShoppingCart,\n  FileText, CheckCircle, Target, Heart, Clock,\n  Share2, ThumbsUp, Star\n};\n\nconst cleanNumber = '
);

// 3. Update effectiveDiscovery
d = d.replace(
  /\.\.\.smartDiscovery\.dashboardConfig\?\.chartTitles\s*\n\s*\}/,
  '...smartDiscovery.dashboardConfig?.chartTitles\n        },\n        kpis: smartDiscovery.dashboardConfig?.kpis'
);

fs.writeFileSync(p, d, 'utf8');
console.log('done');
