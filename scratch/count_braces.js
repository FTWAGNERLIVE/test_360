
import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\creat\\Documents\\Projeto_test360\\src\\pages\\Admin.tsx', 'utf-8');
let count = 0;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') count++;
    if (content[i] === '}') count--;
}
console.log('Brace count balance:', count);
