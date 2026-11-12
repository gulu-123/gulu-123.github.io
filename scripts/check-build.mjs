// 检查构建产物的链接与搜索索引；也用于 GitHub Pages 项目子路径验证。
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const [directory,origin]=process.argv.slice(2);
if(!directory||!origin)throw Error('用法：node scripts/check-build.mjs <构建目录> <baseURL>');
const root=path.resolve(directory),base=new URL(origin),failures=[];let pages=0,links=0;
async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const target=path.join(dir,item.name);if(item.isDirectory())await walk(target);else if(item.name.endsWith('.html')){
  pages++;const html=await fs.readFile(target,'utf8');const relative=path.relative(root,target).split(path.sep).join('/');const pageURL=new URL(relative,base);
  for(const match of html.matchAll(/\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)){
    const value=match[1]??match[2]??match[3];if(!value||value.startsWith('#')||/^(mailto:|tel:|data:|javascript:)/i.test(value))continue;
    const url=new URL(value.replaceAll('&amp;','&'),pageURL);if(url.origin!==base.origin)continue;
    if(!url.pathname.startsWith(base.pathname)){failures.push(`${relative}: 路径未包含 baseURL ${value}`);continue;}
    let local=decodeURIComponent(url.pathname.slice(base.pathname.length));if(local.endsWith('/')||!local)local+='index.html';const file=path.resolve(root,local);
    if(file!==root&&!file.startsWith(root+path.sep)){failures.push(`${relative}: 非法路径 ${value}`);continue;}
    try{const stat=await fs.stat(file);if(!stat.isFile())throw Error('not a file');links++;}catch{failures.push(`${relative}: 缺失 ${value}`);}
  }
}}}
await walk(root);
const index=JSON.parse(await fs.readFile(path.join(root,'index.json'),'utf8'));
assert.ok(index.some(p=>p.permalink===new URL('notes/reading-example/',base).href),'示例文章使用稳定英文链接');
assert.ok(index.some(p=>p.content.includes('工具链版本')),'正文进入全文搜索索引');
assert.ok(index.every(p=>p.permalink.startsWith(base.href)),'搜索结果遵循 baseURL');
const example=await fs.readFile(path.join(root,'notes/reading-example/index.html'),'utf8');
assert.match(example,/class=.?chroma|class="[^"]*chroma/,'Hugo 生成代码高亮');
assert.ok(example.includes('<table>'),'表格正常生成');assert.ok(example.includes('fn:1'),'脚注正常生成');assert.ok(example.includes('演示内容'),'示例内容有标注');
assert.equal(failures.length,0,failures.slice(0,15).join('\n'));
console.log(`通过：${pages} 个 HTML 页面、${links} 个本地链接与资源、稳定链接、全文索引、代码高亮、表格及脚注。baseURL=${base.href}`);
