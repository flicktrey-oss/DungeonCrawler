import {defineConfig} from 'vite';

// Publish one self-contained page: a cached HTML file can never refer to JS/CSS
// hashes removed by a newer Pages deployment. Also works at nested URLs/offline.
function standaloneGame(){return {
 name:'standalone-game',apply:'build',enforce:'post',
 generateBundle(_options,bundle){
  const html=bundle['index.html'];if(!html||html.type!=='asset')throw Error('Missing game page');
  const entry=Object.values(bundle).find(file=>file.type==='chunk'&&file.isEntry);
  const styles=Object.values(bundle).filter(file=>file.type==='asset'&&file.fileName.endsWith('.css'));
  if(!entry||entry.imports.length||entry.dynamicImports.length)throw Error('Game must have a single script bundle');
  let source=String(html.source),scripts=0;
  source=source.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/g,()=>{scripts++;return `<script type="module">${entry.code.replace(/<\/script/gi,'<\\/script')}</script>`;});
  if(scripts!==1)throw Error('Expected exactly one game entry script');
  source=source.replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/g,'');
  source=source.replace('</head>',`<style>${styles.map(file=>String(file.source)).join('\n')}</style></head>`);
  html.source=source;delete bundle[entry.fileName];for(const style of styles)delete bundle[style.fileName];
 }
};}
export default defineConfig({base:'./',plugins:[standaloneGame()],build:{rollupOptions:{output:{inlineDynamicImports:true}}}});
