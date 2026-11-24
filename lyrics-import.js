// Generic local LRC handling. No lyric service, network request, or bundled text.
export function parseLrc(input,{duration=Infinity}={}){
 const text=String(input).replace(/^\uFEFF/,'');
 const offsetMatch=text.match(/^\[offset:\s*([+-]?\d+)\s*\]/im),offset=offsetMatch?Number(offsetMatch[1])/1000:0;
 const title=text.match(/^\[ti:(.*?)\]/im)?.[1]?.trim()||'';
 const events=[];
 for(const raw of text.split(/\r?\n/)){
  const matches=[...raw.matchAll(/\[(\d{1,3}):([0-5]?\d)(?:[.:](\d{1,3}))?\]/g)];if(!matches.length)continue;
  const line=raw.replace(/\[[^\]]*\]/g,'').replace(/<\d+:\d+(?:\.\d+)?>/g,'').trim();
  for(const match of matches){const fraction=match[3]?Number('0.'+match[3]):0,start=Math.max(0,Number(match[1])*60+Number(match[2])+fraction-offset);events.push({start,text:line});}
 }
 events.sort((a,b)=>a.start-b.start);
 const unique=[];
 for(const event of events){const previous=unique.at(-1);if(previous?.start===event.start){if(event.text&&event.text!==previous.text)previous.text=previous.text?previous.text+' · '+event.text:event.text;}else unique.push({...event});}
 const valid=unique.filter(row=>row.text&&!/^(暂无歌词|暂无纯音乐歌词|纯音乐[，,\s]*请欣赏|暂无)$/i.test(row.text));
 if(!valid.length)throw Error('这份文件没有可用的逐句歌词，请选择带时间标签的 LRC 文件。');
 if(valid.length>3000)throw Error('歌词行数过多，请检查文件内容。');
 if(valid.some(row=>row.start>=duration))throw Error('歌词时间超出了这首音频，请检查是否为同一个版本。');
 const lines=valid.map(row=>{const next=unique.find(event=>event.start>row.start);return{...row,end:Math.max(row.start,Math.min(duration,next?.start??row.start+8)),explicitEnd:!!next&&!next.text};});
 return{title,lines};
}

export async function readLocalLrc(file,options){
 if(!file||file.size>1024*1024)throw Error('请选择不超过 1 MB 的 LRC 文件。');
 const bytes=await file.arrayBuffer();let text;
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('gb18030',{fatal:true}).decode(bytes);}
 return parseLrc(text,options);
}
