import type { ScanItem } from "./types";

const matchVuetifyDirectives = /v-(resize|click-outside|mutate|intersect|resize|ripple|scroll)/ig;
const chartkick = 'line-chart,pie-chart,column-chart,bar-chart,area-chart,scatter-chart,geo-chart,timeline,';
const otherDependencies = chartkick + 'draggable,quill-editor,vue-cropper,v-chart,tip-tap'.split(',');
const ignoreHtmlElements = 'div,span,hr,a,b,s,i,p,ul,ol,li,table,thead,tbody,tfoot,tr,th,td,small,strong,strike,em,sup,select,code,pre,nav,h1,h2,h3,h4,h5,h6,time,img,canvas,section,iframe,form,fieldset,label,button,input,main,aside,header,footer,dialog,html,body,style'.split(',');
const ignoreMetaElements = 'component,scrollbar,template,slot,keep-alive,n-link,nuxt,nuxt-child'.split(',');
const ignoreBooleanProps = 'dense,disabled,required,scrollable,danger,nuxt,prominent,nav,narrow,readonly,top,left,right,bottom,outlined,multiple,mandatory,hide-actions'.split(',');
const ignoreSvgElements = 'svg,g,line,rect,circle,ellipse,feOffset,feGaussianBlur,feBlend,path,filter,pattern,marker,defs,polygon,polyline,image,text'.split(',');
const matchSimpleComponents = /^v-(spacer|divider|col|row|icon)$/;
const matchTransitions = /^v-(.+)-transition$/;
const ignoreDirectives = 'v-else'.split(',');

export async function analyzeFile(baseDir: string, path: string, name: string): Promise<ScanItem> {
  const text = await Bun.file(`${baseDir}/${path}`).text();
  const [template, rest] = text.split('<script>');
  const script = (rest ?? template).split('</script>')[0];
  const vDeps = [...(template.match(/<[a-z][a-z\-0-9]+(\.|\r|\n| |:|>)/ig) ?? [])]
    .map(m => m.replace(/[^a-z\-0-9]/ig, '').replace('lazy-', ''))
    .filter(n => !ignoreHtmlElements.includes(n))
    .filter(n => !ignoreMetaElements.includes(n))
    .filter(n => !ignoreBooleanProps.includes(n))
    .filter(n => !ignoreSvgElements.includes(n))
    .filter(n => !ignoreDirectives.includes(n))
    .filter(n => !matchSimpleComponents.test(n))
    .filter(n => !matchTransitions.test(n))
    .filter((n,i,a) => a.indexOf(n) === i)
    .sort();
  const vuetifyDirectives = [...(template.match(/(\n|\n\s+|\()[a-z\-]+(\.|=|\n| |\))/ig) ?? [])]
    .map(m => m.replace(/[^a-z\-]/ig, ''))
    .filter(n => matchVuetifyDirectives.test(n))
    .filter((n,i,a) => a.indexOf(n) === i)
    .sort();
  const localImports = [...(script.match(/\/?[a-z\-]+\.vue/ig) ?? [])]
    .map(m => m.replace(/\//ig, '').replace('.vue', ''))
    .filter((n,i,a) => a.indexOf(n) === i)
    .sort();

  return {
    name: name.split('/').at(-1)!.replace('.vue', ''),
    path,
    localDependencies: vDeps.filter(x => !otherDependencies.includes(x) && !x.startsWith('v-')),
    otherDependencies: vDeps.filter(x => otherDependencies.includes(x)),
    localImports,
    vuetifyComponents: vDeps.filter(x => !otherDependencies.includes(x) && x.startsWith('v-') && !matchVuetifyDirectives.test(x)),
    vuetifyDirectives,
  };
}