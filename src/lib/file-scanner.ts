import type { ScanItem } from "./types";

const matchVuetifyDirectives = /v-(resize|click-outside|mutate|intersect|resize|ripple|scroll)/ig;
const chartkick = 'line-chart,pie-chart,column-chart,bar-chart,area-chart,scatter-chart,geo-chart,timeline,';
const otherDependencies = chartkick + 'draggable,quill-editor,vue-cropper,v-chart,tip-tap'.split(',');
const ignoreHtmlElements = 'a,abbr,address,area,article,aside,audio,b,base,bdi,bdo,blockquote,body,br,button,canvas,caption,cite,code,col,colgroup,data,datalist,dd,del,details,dfn,dialog,div,dl,dt,em,embed,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,i,iframe,img,input,ins,kbd,keygen,label,legend,li,link,main,map,mark,menu,meta,meter,nav,noindex,noscript,object,ol,optgroup,option,output,p,param,picture,pre,progress,q,rp,rt,ruby,s,samp,script,section,select,small,source,span,strong,style,sub,summary,sup,table,template,tbody,td,textarea,tfoot,th,thead,time,title,tr,track,u,ul,var,video,wbr,webview'.split(',');
const ignoreMetaElements = 'component,scrollbar,template,slot,keep-alive,n-link,nuxt,nuxt-child'.split(',');
const ignoreBooleanProps = 'dense,disabled,required,scrollable,danger,nuxt,prominent,nav,narrow,readonly,top,left,right,bottom,outlined,multiple,mandatory,hide-actions'.split(',');
const ignoreSvgElements = 'svg,animate,animateMotion,animateTransform,circle,clipPath,defs,desc,ellipse,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,foreignObject,g,image,line,linearGradient,marker,mask,metadata,mpath,path,pattern,polygon,polyline,radialGradient,rect,stop,switch,symbol,text,textPath,tspan,use,view'.split(',');
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