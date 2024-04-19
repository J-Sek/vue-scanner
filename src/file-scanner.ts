import type { ScanItem } from "./types";

const directivesRegex = /v-(resize|html|click-outside|mutate|intersect|resize|ripple|scroll)/ig;
const otherDependencies = 'draggable,quill-editor,vue-cropper,v-chart'.split(',');
const ignoreHtmlElements = 'div,span,hr,a,b,p,ul,ol,li,table,tbody,thead,tr,th,td,small,strong,strike,em,select,code,pre,nav,h1,h2,h3,h4,h5,h6,time,img,canvas,section,iframe,form,fieldset,label,button,input,main,aside,header,footer,dialog'.split(',');
const ignoreMetaElements = 'component,scrollbar,template,slot,keep-alive,n-link'.split(',');
const ignoreBooleanProps = 'dense,disabled,required,scrollable,danger,nuxt,prominent,nav,narrow,readonly,top,left,right,bottom,outlined,multiple,mandatory,hide-actions'.split(',');
const ignoreSvgElements = 'svg,g,line,rect,circle,ellipse,feOffset,feGaussianBlur,feBlend,path,filter,pattern,marker,defs,polygon,polyline,image,text'.split(',');
const ignoreSimpleComponents = /^v-(spacer|divider|col|row|icon)$/;
const ignoreTransitions = /^v-(.+)-transition$/;
const ignoreDirectives = 'v-else'.split(',');

export async function analyzeFile(baseDir: string, path: string, name: string): Promise<ScanItem> {
  const text = await Bun.file(`${baseDir}/${path}`).text();
  const [template, rest] = text.split('</template>');
  const script = (rest ?? template).split('</script>')[0];
  const vDeps = [...(template.match(/(\n|\n\s+|#\[)[a-z\-]+(\.|\(|\n| |:)/g) ?? [])]
    .map(m => m.replace(/[^a-z\-]/ig, '').replace('lazy-', ''))
    .filter(n => !ignoreHtmlElements.includes(n))
    .filter(n => !ignoreMetaElements.includes(n))
    .filter(n => !ignoreBooleanProps.includes(n))
    .filter(n => !ignoreSvgElements.includes(n))
    .filter(n => !ignoreDirectives.includes(n))
    .filter(n => !ignoreSimpleComponents.test(n))
    .filter(n => !ignoreTransitions.test(n))
    .filter((n,i,a) => a.indexOf(n) === i)
    .sort();
  const vuetifyDirectives = [...(template.match(/(\n|\n\s+|\()[a-z\-]+(\.|=|\n| |\))/ig) ?? [])]
    .map(m => m.replace(/[^a-z\-]/ig, ''))
    .filter(n => directivesRegex.test(n))
    .filter((n,i,a) => a.indexOf(n) === i)
    .sort();
  const localImports = [...(script.match(/\/?[a-z\-]+\.vue/ig) ?? [])]
    .map(m => m.replace(/\//ig, '').replace('.vue', ''))
    .filter((n,i,a) => a.indexOf(n) === i)
    .sort();

  return {
    name,
    path,
    localDependencies: vDeps.filter(x => !otherDependencies.includes(x) && !x.startsWith('v-')),
    otherDependencies: vDeps.filter(x => otherDependencies.includes(x)),
    localImports,
    vuetifyComponents: vDeps.filter(x => !otherDependencies.includes(x) && x.startsWith('v-') && !directivesRegex.test(x)),
    vuetifyDirectives,
  };
}