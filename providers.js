const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const PROVIDERS = {
  openai:{name:"OpenAI",kind:"openai",baseUrl:"https://api.openai.com/v1",model:"gpt-4o-mini"},
  anthropic:{name:"Anthropic Claude",kind:"anthropic",baseUrl:"https://api.anthropic.com/v1",model:"claude-sonnet-4-5"},
  google:{name:"Google Gemini",kind:"gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta",model:"gemini-2.5-flash"},
  deepseek:{name:"DeepSeek",kind:"openai",baseUrl:"https://api.deepseek.com/v1",model:"deepseek-v4-flash"},
  groq:{name:"Groq",kind:"openai",baseUrl:"https://api.groq.com/openai/v1",model:"openai/gpt-oss-120b"},
  openrouter:{name:"OpenRouter",kind:"openai",baseUrl:"https://openrouter.ai/api/v1",model:"openrouter/auto"},
  together:{name:"Together AI",kind:"openai",baseUrl:"https://api.together.xyz/v1",model:"meta-llama/Llama-3.3-70B-Instruct-Turbo"},
  fireworks:{name:"Fireworks AI",kind:"openai",baseUrl:"https://api.fireworks.ai/inference/v1",model:"accounts/fireworks/models/llama-v3p3-70b-instruct"},
  mistral:{name:"Mistral AI",kind:"openai",baseUrl:"https://api.mistral.ai/v1",model:"mistral-small-latest"},
  xai:{name:"xAI Grok",kind:"openai",baseUrl:"https://api.x.ai/v1",model:"grok-3-mini"},
  cerebras:{name:"Cerebras",kind:"openai",baseUrl:"https://api.cerebras.ai/v1",model:"llama-3.3-70b"},
  perplexity:{name:"Perplexity",kind:"openai",baseUrl:"https://api.perplexity.ai",model:"sonar"},
  cohere:{name:"Cohere",kind:"openai",baseUrl:"https://api.cohere.com/compatibility/v1",model:"command-a-03-2025"},
  nvidia:{name:"NVIDIA NIM",kind:"openai",baseUrl:"https://integrate.api.nvidia.com/v1",model:"nvidia/llama-3.1-nemotron-70b-instruct"},
  huggingface:{name:"Hugging Face Inference",kind:"openai",baseUrl:"https://router.huggingface.co/v1",model:"Qwen/Qwen2.5-7B-Instruct"},
  qwen:{name:"Qwen / Alibaba DashScope",kind:"openai",baseUrl:"https://dashscope.aliyuncs.com/compatible-mode/v1",model:"qwen-plus"},
  kimi:{name:"Moonshot Kimi",kind:"openai",baseUrl:"https://api.moonshot.ai/v1",model:"moonshot-v1-8k"},
  zai:{name:"Z.ai / GLM",kind:"openai",baseUrl:"https://api.z.ai/api/paas/v4",model:"glm-4.5"},
  siliconflow:{name:"SiliconFlow",kind:"openai",baseUrl:"https://api.siliconflow.com/v1",model:"Qwen/Qwen2.5-7B-Instruct"},
  novita:{name:"Novita AI",kind:"openai",baseUrl:"https://api.novita.ai/v3/openai",model:"meta-llama/llama-3.1-8b-instruct"},
  inference:{name:"Inference.net",kind:"openai",baseUrl:"https://api.inference.net/v1",model:"meta-llama/Llama-3.3-70B-Instruct"},
  custom:{name:"Custom OpenAI-compatible",kind:"openai",baseUrl:"",model:""}
};

class ProviderHub {
  constructor(dataDir) {
    this.file=path.join(dataDir,"providers.enc");
    this.usageFile=path.join(dataDir,"provider-usage.json");
    this.key=process.env.ALLO_ENCRYPTION_KEY?crypto.createHash("sha256").update(process.env.ALLO_ENCRYPTION_KEY).digest():null;
    this.configs={};this.usage={requests:0,inputTokens:0,outputTokens:0,providers:{},updatedAt:null};
  }
  async init(){
    try{this.usage=JSON.parse(await fs.readFile(this.usageFile,"utf8"));}catch(e){if(e.code!=="ENOENT")throw e;}
    if(!this.key)return;
    try{const saved=JSON.parse(await fs.readFile(this.file,"utf8"));const d=crypto.createDecipheriv("aes-256-gcm",this.key,Buffer.from(saved.iv,"base64"));d.setAuthTag(Buffer.from(saved.tag,"base64"));this.configs=JSON.parse(Buffer.concat([d.update(Buffer.from(saved.data,"base64")),d.final()]).toString("utf8"));}
    catch(e){if(e.code!=="ENOENT")throw new Error("Could not decrypt provider settings. Check ALLO_ENCRYPTION_KEY.");}
  }
  async save(){
    if(!this.key){const e=new Error("Set ALLO_ENCRYPTION_KEY on the server before saving provider settings.");e.status=503;throw e;}
    await fs.mkdir(path.dirname(this.file),{recursive:true});const iv=crypto.randomBytes(12),c=crypto.createCipheriv("aes-256-gcm",this.key,iv);
    const data=Buffer.concat([c.update(JSON.stringify(this.configs),"utf8"),c.final()]);
    const tmp=this.file+"."+process.pid+".tmp";
    await fs.writeFile(tmp,JSON.stringify({iv:iv.toString("base64"),tag:c.getAuthTag().toString("base64"),data:data.toString("base64")}),{mode:0o600});await fs.rename(tmp,this.file);
  }
  async saveUsage(){await fs.mkdir(path.dirname(this.usageFile),{recursive:true});const tmp=this.usageFile+"."+process.pid+".tmp";await fs.writeFile(tmp,JSON.stringify(this.usage,null,2),{mode:0o600});await fs.rename(tmp,this.usageFile);}
  list(){return Object.entries(PROVIDERS).map(([id,p])=>({id,name:p.name,kind:p.kind,baseUrl:this.configs[id]?.baseUrl||p.baseUrl,model:this.configs[id]?.model||p.model,inputPricePerMillion:this.configs[id]?.inputPricePerMillion??null,outputPricePerMillion:this.configs[id]?.outputPricePerMillion??null,monthlyBudgetUsd:this.configs[id]?.monthlyBudgetUsd??null,configured:Boolean(this.configs[id]?.apiKey),hasKey:Boolean(this.configs[id]?.apiKey)}));}
  async configure(input){
    const id=String(input.provider||"");if(!PROVIDERS[id]){const e=new Error("Unknown provider.");e.status=400;throw e;}
    const prev=this.configs[id]||{},apiKey=typeof input.apiKey==="string"&&input.apiKey.trim()?input.apiKey.trim():prev.apiKey;
    if(!apiKey){const e=new Error("API key is required.");e.status=400;throw e;}
    const baseUrl=String(input.baseUrl||prev.baseUrl||PROVIDERS[id].baseUrl).trim();
    if(!baseUrl||!/^https:\/\//i.test(baseUrl)){const e=new Error("Provider URL must use HTTPS.");e.status=400;throw e;}
    const model=String(input.model||prev.model||PROVIDERS[id].model).trim();if(!model){const e=new Error("Model ID is required.");e.status=400;throw e;}
    const rate=(v,old)=>v===""||v===undefined||v===null?old:Number(v);
    const inputRate=rate(input.inputPricePerMillion,prev.inputPricePerMillion),outputRate=rate(input.outputPricePerMillion,prev.outputPricePerMillion);
    const budget=rate(input.monthlyBudgetUsd,prev.monthlyBudgetUsd);
    for(const [label,n] of [["Input token price",inputRate],["Output token price",outputRate],["Monthly budget",budget]])if(n!==undefined&&(!Number.isFinite(n)||n<0)){const e=new Error(label+" must be a non-negative number.");e.status=400;throw e;}
    this.configs[id]={apiKey,baseUrl:baseUrl.replace(/\/+$/,""),model,inputPricePerMillion:inputRate,outputPricePerMillion:outputRate,monthlyBudgetUsd:budget};
    await this.save();return this.list().find(p=>p.id===id);
  }
  async remove(id){delete this.configs[id];await this.save();}
  billing(){
    const month=new Date().toISOString().slice(0,7),rows=Object.entries(this.usage.providers||{}).map(([id,v])=>{const c=this.configs[id]||{},m=(v.months||{})[month]||{requests:0,inputTokens:0,outputTokens:0,estimatedCostUsd:0};return{id,name:PROVIDERS[id]?.name||id,...m,budgetUsd:c.monthlyBudgetUsd??null,inputRate:c.inputPricePerMillion??null,outputRate:c.outputPricePerMillion??null};});
    return {currency:"USD",month,requests:this.usage.requests||0,inputTokens:this.usage.inputTokens||0,outputTokens:this.usage.outputTokens||0,providers:rows,notice:"Token counts are provider-reported where available. Estimated costs are calculated only when you enter your provider's current per-million-token rates. This is not the provider's invoice or live account balance."};
  }
  async models(id){
    const p=PROVIDERS[id],c=this.configs[id];if(!p||!c?.apiKey){const e=new Error("Configure this provider first.");e.status=400;throw e;}
    let url,headers;
    if(p.kind==="gemini"){url=c.baseUrl+"/models?key="+encodeURIComponent(c.apiKey);headers={};}
    else if(p.kind==="anthropic"){url=c.baseUrl+"/models";headers={"x-api-key":c.apiKey,"anthropic-version":"2023-06-01"};}
    else{url=c.baseUrl+"/models";headers={authorization:"Bearer "+c.apiKey};}
    const r=await fetch(url,{headers,signal:AbortSignal.timeout(30000)}),d=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(d.error?.message||d.message||("Model discovery failed: HTTP "+r.status));e.status=r.status;throw e;}
    const items=d.data||d.models||[];
    return items.map(m=>{const raw=String(m.id||m.name||"");const id=p.kind==="gemini"?raw.replace(/^models\//,""):raw;return{id,name:String(m.display_name||m.name||m.id||"").replace(/^models\//,"")};}).filter(m=>m.id).sort((a,b)=>a.id.localeCompare(b.id));
  }
  async request(id,messages,options={}){
    const p=PROVIDERS[id],c=this.configs[id];if(!p||!c?.apiKey){const e=new Error("Configure this provider in Settings first.");e.status=400;throw e;}
    let url,headers,payload;
    if(p.kind==="anthropic"){url=c.baseUrl+"/messages";headers={"x-api-key":c.apiKey,"anthropic-version":"2023-06-01","content-type":"application/json"};const system=messages.filter(m=>m.role==="system").map(m=>m.content).join("\n");payload={model:c.model,max_tokens:options.max_tokens||2048,messages:messages.filter(m=>m.role!=="system"),...(system?{system}:{}),temperature:options.temperature??0.7};}
    else if(p.kind==="gemini"){url=c.baseUrl+"/models/"+encodeURIComponent(c.model)+":generateContent?key="+encodeURIComponent(c.apiKey);headers={"content-type":"application/json"};const system=messages.filter(m=>m.role==="system").map(m=>m.content).join("\n");payload={contents:messages.filter(m=>m.role!=="system").map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:String(m.content||"")}]})),generationConfig:{temperature:options.temperature??0.7,maxOutputTokens:options.max_tokens||2048},...(system?{systemInstruction:{parts:[{text:system}]}}:{})};}
    else{url=c.baseUrl+"/chat/completions";headers={authorization:"Bearer "+c.apiKey,"content-type":"application/json"};payload={model:c.model,messages,temperature:options.temperature??0.7,max_tokens:options.max_tokens||2048};}
    const r=await fetch(url,{method:"POST",headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)}),d=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(d.error?.message||d.message||d.error||("Provider request failed: HTTP "+r.status));e.status=r.status;throw e;}
    let content="";if(p.kind==="anthropic")content=(d.content||[]).filter(x=>x.type==="text").map(x=>x.text).join("");else if(p.kind==="gemini")content=(d.candidates?.[0]?.content?.parts||[]).map(x=>x.text||"").join("");else content=d.choices?.[0]?.message?.content||"";
    const raw=d.usage||d.usageMetadata||{},input=Number(raw.prompt_tokens??raw.input_tokens??raw.promptTokenCount??0),output=Number(raw.completion_tokens??raw.output_tokens??raw.candidatesTokenCount??0);
    const month=new Date().toISOString().slice(0,7),entry=this.usage.providers[id]||{requests:0,inputTokens:0,outputTokens:0,months:{}},m=entry.months[month]||{requests:0,inputTokens:0,outputTokens:0,estimatedCostUsd:0};
    const cost=(input*(Number(c.inputPricePerMillion)||0)+output*(Number(c.outputPricePerMillion)||0))/1000000;
    entry.requests++;entry.inputTokens+=input;entry.outputTokens+=output;m.requests++;m.inputTokens+=input;m.outputTokens+=output;m.estimatedCostUsd+=cost;entry.months[month]=m;this.usage.providers[id]=entry;
    this.usage.requests=(this.usage.requests||0)+1;this.usage.inputTokens=(this.usage.inputTokens||0)+input;this.usage.outputTokens=(this.usage.outputTokens||0)+output;this.usage.updatedAt=new Date().toISOString();await this.saveUsage();
    return {model:c.model,message:{role:"assistant",content},done:true,usage:raw,billing:{inputTokens:input,outputTokens:output,estimatedCostUsd:cost}};
  }
}
module.exports={ProviderHub,PROVIDERS};
