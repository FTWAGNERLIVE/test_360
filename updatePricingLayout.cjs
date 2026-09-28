const fs = require('fs');
let code = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

code = code.replace(
  /import \{ Check, X, Sparkles, Zap, Shield, Crown \} from 'lucide-react'/,
  "import { Check, X, Sparkles, Zap, Shield, Crown, ArrowLeft } from 'lucide-react'"
);

code = code.replace(
  /<div className="pricing-header">\s*<button className="back-btn" onClick=\{\(\) => navigate\(-1\)\}>\s*.*?\s*<\/button>/s,
  `<button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Voltar
      </button>
      <div className="pricing-header">`
);

fs.writeFileSync('src/pages/Pricing.tsx', code, 'utf8');
console.log('Fixed Pricing.tsx markup');
