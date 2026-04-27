const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/mermaid.core.BUaz-7lN.js","_astro/preload-helper.CRT-xddh.js","_astro/chunk-U2HBQHQK.BLhhvnkH.js","_astro/src.ChPiDRxD.js","_astro/chunk.YnrUVBcZ.js","_astro/chunk-5PVQY5BW.DvBIi468.js","_astro/dist.BWrwseDN.js","_astro/chunk-ICPOFSXX.CsabCB5j.js","_astro/_baseFor.MYUh0DEC.js","_astro/isEmpty.B4rgq0Yq.js","_astro/chunk-336JU56O.C3YV4Ef-.js","_astro/chunk-5FUZZQ4R.C9uFTgO9.js","_astro/chunk-X2U36JSP.Dx7biVd3.js","_astro/chunk-ZZ45TVLE.JLhYtqbY.js","_astro/rough.esm.DnSdFP3W.js","_astro/chunk-ENJZ2VHE.DFwPGzyT.js","_astro/line.DqiH0Ide.js","_astro/path.CzQC_GcO.js","_astro/array.BqjZdQME.js","_astro/chunk-BSJP7CBP.CRQXwrIq.js","_astro/chunk-426QAEUC.CuK4XT-x.js","_astro/chunk-XPW4576I.eb6hRgKy.js"])))=>i.map(i=>d[i]);
import{t as e}from"./preload-helper.CRT-xddh.js";import{t}from"./prefetch.B8-D0etJ.js";var n=(...e)=>console.log(`[astro-mermaid]`,...e),r=(...e)=>console.error(`[astro-mermaid]`,...e),i=()=>document.querySelectorAll(`pre.mermaid`).length>0,a=null;async function o(){return a||(n(`Loading mermaid.js...`),a=e(async()=>{let{default:e}=await import(`./mermaid.core.BUaz-7lN.js`);return{default:e}},__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21])).then(async({default:e})=>{let t=[];if(t&&t.length>0){n(`Registering`,t.length,`icon packs`);let r=t.map(e=>({name:e.name,loader:()=>fetch(e.url).then(e=>e.json())}));await e.registerIconPacks(r)}return e}).catch(e=>{throw r(`Failed to load mermaid:`,e),a=null,e}),a)}var s={startOnLoad:!1,theme:`default`},c={light:`default`,dark:`dark`};async function l(){n(`Initializing mermaid diagrams...`);let e=document.querySelectorAll(`pre.mermaid`);if(n(`Found`,e.length,`mermaid diagrams`),e.length===0)return;let t=await o(),i=s.theme;{let e=document.documentElement.getAttribute(`data-theme`),t=document.body.getAttribute(`data-theme`);i=c[e||t]||s.theme,n(`Using theme:`,i,`from`,e?`html`:`body`)}t.initialize({...s,theme:i,gitGraph:{mainBranchName:`main`,showCommitLabel:!0,showBranches:!0,rotateCommitLabel:!0}});for(let i of e){if(i.hasAttribute(`data-processed`))continue;i.hasAttribute(`data-diagram`)||i.setAttribute(`data-diagram`,i.textContent||``);let e=i.getAttribute(`data-diagram`)||``,a=`mermaid-`+Math.random().toString(36).slice(2,11);n(`Rendering diagram:`,a);try{let r=document.getElementById(a);r&&r.remove();let{svg:o}=await t.render(a,e);i.innerHTML=o,i.setAttribute(`data-processed`,`true`),n(`Successfully rendered diagram:`,a)}catch(e){r(`Mermaid rendering error for diagram:`,a,e);let t=document.createElement(`div`);t.style.cssText=`color: red; padding: 1rem; border: 1px solid red; border-radius: 0.5rem;`;let n=document.createElement(`strong`);n.textContent=`Error rendering diagram:`;let o=document.createElement(`span`);o.textContent=` `+(e.message||`Unknown error`),t.appendChild(n),t.appendChild(o),i.textContent=``,i.appendChild(t),i.setAttribute(`data-processed`,`true`)}}}i()?(n(`Mermaid diagrams detected on initial load`),l()):n(`No mermaid diagrams found on initial load`);{let e=new MutationObserver(e=>{for(let t of e)t.type===`attributes`&&t.attributeName===`data-theme`&&(document.querySelectorAll(`pre.mermaid[data-processed]`).forEach(e=>{e.removeAttribute(`data-processed`)}),l())});e.observe(document.documentElement,{attributes:!0,attributeFilter:[`data-theme`]}),e.observe(document.body,{attributes:!0,attributeFilter:[`data-theme`]})}document.addEventListener(`astro:after-swap`,()=>{n(`View transition detected`),i()&&l()});var u=document.createElement(`style`);u.textContent=`
            /* Prevent layout shifts by setting minimum height */
            pre.mermaid {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 2rem 0;
              padding: 1rem;
              background-color: transparent;
              border: none;
              overflow: auto;
              min-height: 200px; /* Prevent layout shift */
              position: relative;
            }
            
            /* Loading state with skeleton loader */
            pre.mermaid:not([data-processed]) {
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
            }
            
            /* Dark mode skeleton loader */
            [data-theme="dark"] pre.mermaid:not([data-processed]) {
              background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
              background-size: 200% 100%;
            }
            
            @keyframes shimmer {
              0% {
                background-position: -200% 0;
              }
              100% {
                background-position: 200% 0;
              }
            }
            
            /* Show processed diagrams with smooth transition */
            pre.mermaid[data-processed] {
              animation: none;
              background: transparent;
              min-height: auto; /* Allow natural height after render */
            }
            
            /* Ensure responsive sizing for mermaid SVGs */
            pre.mermaid svg {
              max-width: 100%;
              height: auto;
            }
            
            /* Optional: Add subtle background for better visibility */
            @media (prefers-color-scheme: dark) {
              pre.mermaid[data-processed] {
                background-color: rgba(255, 255, 255, 0.02);
                border-radius: 0.5rem;
              }
            }
            
            @media (prefers-color-scheme: light) {
              pre.mermaid[data-processed] {
                background-color: rgba(0, 0, 0, 0.02);
                border-radius: 0.5rem;
              }
            }
            
            /* Respect user's color scheme preference */
            [data-theme="dark"] pre.mermaid[data-processed] {
              background-color: rgba(255, 255, 255, 0.02);
              border-radius: 0.5rem;
            }
            
            [data-theme="light"] pre.mermaid[data-processed] {
              background-color: rgba(0, 0, 0, 0.02);
              border-radius: 0.5rem;
            }
          `,document.head.appendChild(u),t();