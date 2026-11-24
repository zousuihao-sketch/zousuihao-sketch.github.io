const AUDIO_EXTENSIONS=/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i;
import {readLocalLrc} from './lyrics-import.js';
import {createLyricsStore,lyricsKey} from './lyrics-store.js';
export function createMusic(onChange,onMessage){
 const audio=new Audio();audio.preload='metadata';audio.volume=.4;
 const lyricStore=createLyricsStore();
 let tracks=[],index=-1,playbackRequest=0,libraryLoaded=false,disposed=false,started=false,lyricsRevision=0;
 const emit=()=>{if(!disposed)onChange({tracks,index,started,playing:!audio.paused,current:audio.currentTime||0,duration:Number.isFinite(audio.duration)?audio.duration:0,volume:audio.volume});};
 for(const name of ['loadedmetadata','durationchange','timeupdate','seeked','play','pause','volumechange'])audio.addEventListener(name,()=>{if(name==='play')started=true;emit();});
 audio.addEventListener('ended',()=>{if(tracks.length>1)select((index+1)%tracks.length,true);else{audio.currentTime=0;emit();}});
 audio.addEventListener('error',()=>{onMessage('这首音频暂时无法播放，请试试 MP3 或 WAV 格式。');emit();});
 async function play(){if(index<0){onMessage('先添加一首你喜欢的音乐吧。');return false;}const request=++playbackRequest;try{await audio.play();return request===playbackRequest;}catch(error){if(request!==playbackRequest||error.name==='AbortError')return false;onMessage('音频暂时无法播放，请重新点击播放或换一首。');emit();return false;}}
 function select(next,autoplay=false){if(!tracks.length)return;playbackRequest++;index=(next+tracks.length)%tracks.length;started=false;audio.src=tracks[index].url;audio.load();emit();if(autoplay)void play();}
 async function restoreLyrics(track){
  const key=lyricsKey(track),revision=track.lyricRevision||0;if(!key)return;
  try{const saved=await lyricStore.get(key);if(disposed||track.localLyrics||(track.lyricRevision||0)!==revision||!saved||saved.title!==(track.title||track.name)||saved.artist!==(track.artist||''))return;
   track.lyrics=saved.lines;track.lyricVersion=saved.version;track.localLyrics=true;track.lyricPersistence='saved';emit();
  }catch{} // Unavailable browser storage must never prevent ordinary playback.
 }
 async function bundledLyrics(track){
  const revision=track.lyricRevision||0;
  try{if(!track.lyricsUrl)return;const response=await fetch(track.lyricsUrl);if(!response.ok)throw Error('lyrics');const data=await response.json();if(disposed)return;
   const lines=data.lines.filter(row=>Number.isFinite(row.start)&&Number.isFinite(row.end)&&row.end>=row.start&&typeof row.text==='string');if(!lines.length)throw Error('empty lyrics');
   track.bundledLyrics={...data,lines};
   if(track.localLyrics||(track.lyricRevision||0)!==revision)return true;
   track.lyrics=lines;track.lyricVersion=data.version;emit();return true;
  }catch{return false;}
 }
 return{
  play,
  async loadLibrary(){
   if(libraryLoaded||disposed)return;libraryLoaded=true;
   try{
    const response=await fetch('./assets/music/tracks.json');if(!response.ok)throw Error();const library=await response.json();
    if(disposed)return;const existing=tracks.length,newTracks=library.map(t=>({...t,name:t.title,lyrics:[]}));tracks.push(...newTracks);
    if(!existing&&tracks.length)select(Math.max(0,tracks.findIndex(t=>t.id==='qilixiang')));else emit();
    await Promise.allSettled(newTracks.flatMap(track=>[restoreLyrics(track),bundledLyrics(track)]));
   }catch{if(!disposed)onMessage('预设歌单暂时没能加载，你仍可添加本地音乐。');}
  },
  addFiles(files){const valid=Array.from(files).filter(f=>f.type.startsWith('audio/')||AUDIO_EXTENSIONS.test(f.name));if(!valid.length){onMessage('请选择 MP3、WAV 等音频文件。');return false;}for(const file of valid){const name=file.name.replace(/\.[^.]+$/,'');const track={id:`local-${tracks.length}`,title:name,name,artist:'本地音乐',album:'我的收藏',year:'',cover:null,lyrics:[],local:true,lyricsStorageKey:JSON.stringify(['file',file.name,file.size,file.lastModified]),url:URL.createObjectURL(file)};tracks.push(track);void restoreLyrics(track);}if(index<0)select(0);else emit();onMessage(`已添加 ${valid.length} 首音乐，仅在当前浏览器播放。`);return true;},
  async importLyrics(file,targetIndex=index,duration=Infinity){
   const track=tracks[targetIndex];if(!track||disposed)return false;
   const request=track.lyricRequest=(track.lyricRequest||0)+1;
   try{
    const parsed=await readLocalLrc(file,{duration:duration>0?duration:Infinity});if(disposed||track.lyricRequest!==request)return false;
    const normalize=value=>value.normalize('NFKC').replace(/\s+/g,'');
    if(parsed.title&&normalize(parsed.title)!==normalize(track.title||track.name))throw Error('歌词文件中的歌名与当前歌曲不同，请先选择对应唱片。');
    const revision=track.lyricRevision=(track.lyricRevision||0)+1;
    const version='local-'+Date.now()+'-'+(++lyricsRevision);track.lyrics=parsed.lines;track.lyricVersion=version;track.localLyrics=true;track.lyricPersistence='saving';track.lyricClearing=false;emit();
    try{const key=lyricsKey(track);if(!key)throw Error('no song identity');await lyricStore.put({key,title:track.title||track.name,artist:track.artist||'',version,lines:parsed.lines,updatedAt:Date.now(),audioDuration:Number.isFinite(duration)?duration:null});
     if(disposed||track.lyricRevision!==revision)return true;track.lyricPersistence='saved';emit();onMessage(`《${track.title||track.name}》歌词已保存到此浏览器，刷新后会自动恢复。`);
    }catch{if(disposed||track.lyricRevision!==revision)return true;track.lyricPersistence='session';emit();onMessage('歌词本次可以使用，但浏览器未能保存；刷新后需要重新导入。');}
    return true;
   }catch(error){if(!disposed)onMessage(error.message||'歌词文件未能读取，请检查格式。');return false;}
  },
  async clearLyrics(targetIndex=index){
   const track=tracks[targetIndex];if(!track||!track.localLyrics||disposed)return false;
   track.lyricRequest=(track.lyricRequest||0)+1;const revision=track.lyricRevision=(track.lyricRevision||0)+1;track.lyricClearing=true;emit();
   try{if(track.lyricsUrl&&!track.bundledLyrics){const restored=await bundledLyrics(track);if(!restored)throw Error('bundled unavailable');}
    if(disposed||track.lyricRevision!==revision)return false;
    const key=lyricsKey(track);if(key)await lyricStore.remove(key);if(disposed||track.lyricRevision!==revision)return false;
    track.localLyrics=false;track.lyricPersistence=null;track.lyrics=[];track.lyricVersion='cleared-'+(++lyricsRevision);track.lyricClearing=false;
    if(track.bundledLyrics){track.lyrics=track.bundledLyrics.lines;track.lyricVersion=track.bundledLyrics.version;}
    emit();
    if(!disposed)onMessage(track.lyricsUrl?'已恢复原版歌词。':'已清除此浏览器保存的本曲歌词。');return true;
   }catch(error){if(!disposed&&track.lyricRevision===revision){track.lyricClearing=false;emit();onMessage(error.message==='bundled unavailable'?'原版歌词暂时未能加载，现有歌词及保存记录仍保留。':'浏览器未能清除保存记录，现有歌词仍保留。');}return false;}
  },
  toggle(){if(audio.paused)return play();playbackRequest++;audio.pause();emit();return Promise.resolve(true);},
  pause(){playbackRequest++;audio.pause();emit();},
  next(){if(tracks.length>1)select(index+1,!audio.paused);},previous(){if(tracks.length>1)select(index-1,!audio.paused);else if(index>=0)audio.currentTime=0;},
  select(i,autoplay=true){if(Number.isInteger(i)&&i>=0&&i<tracks.length)select(i,autoplay);},
  seek(fraction){if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(1,fraction))*audio.duration;},
  volume(value){audio.volume=Math.max(0,Math.min(1,value));},
  refresh:emit,
  dispose(){disposed=true;playbackRequest++;lyricStore.close();audio.pause();for(const track of tracks)if(track.local)URL.revokeObjectURL(track.url);audio.removeAttribute('src');audio.load();}
 };
}
